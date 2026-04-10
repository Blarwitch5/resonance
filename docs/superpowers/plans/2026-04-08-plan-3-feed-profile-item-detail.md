# Plan 3 — Feed, Profile & Item Detail

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the cursor-based feed API and page, the public profile page `/u/[username]`, and the full item detail page `/items/[id]` using the Release/ShelfItem architecture.

**Architecture:** Feed uses a single `WHERE userId IN (followingIds)` query — no N+1. Profile stats run in `Promise.all`. Item detail shows public metadata from Release and private data from ShelfItem (owner only). Privacy enforcement is server-side on every read route.

**Tech Stack:** Astro 6 SSR, Prisma, TypeScript, `locals.user` auth

**Spec:** `docs/superpowers/specs/2026-04-08-social-refactor-design.md` — sections 4, 6, 10, 18, 25, 27

**Depends on:** Plan 1 (Release, ShelfItem, Want models + repositories), Plan 2 (block checks)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/repositories/activity-repository.ts` | Modify | Cursor-based feed + findById |
| `src/repositories/release-repository.ts` | Modify | Add `findOrCreateFromDiscogs` |
| `src/pages/api/feed.ts` | Create | GET cursor-based feed |
| `src/pages/api/releases/[discogsId].ts` | Create | GET/create a Release from Discogs |
| `src/pages/feed.astro` | Create | Feed page (SSR with initial data) |
| `src/pages/u/[username].astro` | Create | Public profile page |
| `src/pages/items/[id].astro` | Modify | Full item detail (Release + ShelfItem) |

---

## Task 1: Update `activity-repository.ts` — cursor-based feed + findById

**Files:**
- Modify: `src/repositories/activity-repository.ts`

- [ ] **Step 1.1: Add cursor-based `getFeedForUser` and `findById`**

Read `src/repositories/activity-repository.ts` first to see the current content, then add/replace the relevant methods. The key changes:

1. Replace page-based pagination with cursor-based (composite cursor: `createdAt` + `id`).
2. Add `findById` used by like and comment routes.

The updated file should look like this (keep any existing methods not listed below):

```typescript
import { db } from '../lib/db'
import type { ActivityType } from '@prisma/client'

export class ActivityRepository {
  async findById(id: string) {
    return db.activity.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true } },
        shelfItem: {
          include: {
            release: { select: { id: true, title: true, artist: true, coverUrl: true } },
          },
        },
      },
    })
  }

  /**
   * Cursor-based feed for a user.
   * Returns activities from followed users, ordered by createdAt DESC.
   * Cursor is a JSON string: { createdAt: string, id: string }
   * Returns up to `take` items + a nextCursor if more exist.
   */
  async getFeedForUser(
    userId: string,
    options: { take?: number; cursor?: string } = {},
  ) {
    const { take = 20, cursor } = options

    // Step 1: Resolve following IDs in a single query
    const follows = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    const followingIds = follows.map((f) => f.followingId)

    // Step 2: Decode cursor
    let cursorWhere: { createdAt: Date; id: string } | undefined
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
        cursorWhere = { createdAt: new Date(decoded.createdAt), id: decoded.id }
      } catch {
        // Invalid cursor — ignore, start from beginning
      }
    }

    // Step 3: Single WHERE IN query — no N+1
    const activities = await db.activity.findMany({
      where: {
        userId: { in: followingIds },
        ...(cursorWhere && {
          OR: [
            { createdAt: { lt: cursorWhere.createdAt } },
            { createdAt: cursorWhere.createdAt, id: { lt: cursorWhere.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
        shelfItem: {
          include: {
            release: {
              select: {
                id: true,
                title: true,
                artist: true,
                coverUrl: true,
                format: true,
              },
            },
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    })

    const hasMore = activities.length > take
    const items = hasMore ? activities.slice(0, take) : activities

    let nextCursor: string | null = null
    if (hasMore) {
      const last = items[items.length - 1]
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id }),
      ).toString('base64')
    }

    return { activities: items, nextCursor }
  }

  async toggleLike(activityId: string, userId: string) {
    const existing = await db.activityLike.findUnique({
      where: { userId_activityId: { userId, activityId } },
    })

    if (existing) {
      await db.activityLike.delete({ where: { id: existing.id } })
      return { liked: false }
    }

    await db.activityLike.create({ data: { activityId, userId } })
    return { liked: true }
  }

  async createActivity(data: {
    userId: string
    type: ActivityType
    shelfItemId?: string
    collectionId?: string
    targetUserId?: string
  }) {
    return db.activity.create({ data })
  }
}

export const activityRepository = new ActivityRepository()
```

- [ ] **Step 1.2: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 1.3: Commit**

```bash
git add src/repositories/activity-repository.ts
git commit -m "feat(feed): cursor-based feed query with no N+1"
```

---

## Task 2: Feed API endpoint

**Files:**
- Create: `src/pages/api/feed.ts`

- [ ] **Step 2.1: Create `GET /api/feed`**

```typescript
import type { APIRoute } from 'astro'
import { activityRepository } from '../../repositories/activity-repository'
import { safeErrorMessage } from '../../lib/api-error'

// GET /api/feed?cursor=xxx&take=20
export const GET: APIRoute = async ({ url, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const cursor = url.searchParams.get('cursor') ?? undefined
  const take = Math.min(Number(url.searchParams.get('take') ?? '20'), 50)

  try {
    const result = await activityRepository.getFeedForUser(currentUser.id, { take, cursor })
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

- [ ] **Step 2.2: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 2.3: Commit**

```bash
git add src/pages/api/feed.ts
git commit -m "feat(feed): add cursor-based feed API endpoint"
```

---

## Task 3: Release API endpoint (get or create from Discogs)

**Files:**
- Create: `src/pages/api/releases/[discogsId].ts`

- [ ] **Step 3.1: Create `GET /api/releases/[discogsId]`**

This endpoint fetches a Release from the DB or creates it by pulling data from the Discogs API. Used by the explore detail page and add flow.

```typescript
import type { APIRoute } from 'astro'
import { releaseRepository } from '../../../repositories/release-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/releases/[discogsId]
export const GET: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const discogsId = params.discogsId
  if (!discogsId) {
    return new Response(JSON.stringify({ error: 'Discogs ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const release = await releaseRepository.findOrCreateFromDiscogs(discogsId)
    if (!release) {
      return new Response(JSON.stringify({ error: 'Release not found on Discogs' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ release }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

- [ ] **Step 3.2: Add `findOrCreateFromDiscogs` to `release-repository.ts`**

Read `src/repositories/release-repository.ts` to see what already exists (Plan 1 creates it). Then add `findOrCreateFromDiscogs` if not present:

```typescript
async findOrCreateFromDiscogs(discogsId: string) {
  // Check DB first
  const existing = await db.release.findUnique({ where: { discogsId } })
  if (existing) return existing

  // Fetch from Discogs API
  const DISCOGS_TOKEN = import.meta.env.DISCOGS_TOKEN
  const url = `https://api.discogs.com/releases/${discogsId}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Discogs token=${DISCOGS_TOKEN}`,
      'User-Agent': 'Resonance/1.0',
    },
  })

  if (!res.ok) return null

  const data = await res.json()

  const format = this.resolveFormat(data.formats ?? [])
  const tracklist = data.tracklist?.map((t: { position: string; title: string; duration: string }) => ({
    position: t.position,
    title: t.title,
    duration: t.duration,
  })) ?? null

  return db.release.create({
    data: {
      discogsId,
      title: data.title ?? 'Unknown',
      artist: data.artists?.[0]?.name ?? 'Unknown',
      label: data.labels?.[0]?.name ?? null,
      year: data.year ?? null,
      country: data.country ?? null,
      format,
      coverUrl: data.images?.[0]?.uri ?? null,
      tracklist,
    },
  })
}

private resolveFormat(formats: Array<{ name: string }>): string {
  const names = formats.map((f) => f.name.toLowerCase())
  if (names.includes('vinyl')) return 'Vinyl'
  if (names.includes('cd')) return 'CD'
  if (names.some((n) => n.includes('cassette'))) return 'Cassette'
  return 'Vinyl' // fallback
}
```

- [ ] **Step 3.3: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 3.4: Commit**

```bash
git add src/pages/api/releases/[discogsId].ts src/repositories/release-repository.ts
git commit -m "feat(releases): add get-or-create release from Discogs API"
```

---

## Task 4: Feed page

**Files:**
- Create: `src/pages/feed.astro`

- [ ] **Step 4.1: Create the feed page with initial SSR data and infinite scroll client**

```astro
---
import Layout from '../components/layouts/Layout.astro'
import { activityRepository } from '../repositories/activity-repository'
import { followRepository } from '../repositories/follow-repository'
import { auth } from '../lib/auth'

const session = await auth.api.getSession({ headers: Astro.request.headers })
if (!session) return Astro.redirect('/login')

const userId = session.user.id

const { activities, nextCursor } = await activityRepository.getFeedForUser(userId, { take: 20 })

// For empty feed: check if user follows anyone
const followingCount = (await followRepository.getFollowing(userId)).length
---

<Layout title="Feed">
  <div class="feed-page max-w-2xl mx-auto px-4 py-4">

    {activities.length === 0 && followingCount === 0 && (
      <div class="empty-feed text-center py-16">
        <p class="text-lg font-medium mb-2">Ton feed est vide</p>
        <p class="text-muted text-sm mb-6">Suis des collectionneurs pour voir leur activité ici.</p>
        <a href="/explore" class="btn-primary">Explorer la communauté</a>
      </div>
    )}

    {activities.length === 0 && followingCount > 0 && (
      <div class="empty-feed text-center py-16">
        <p class="text-muted text-sm">Tes abonnements n'ont pas encore eu d'activité.</p>
      </div>
    )}

    <ul class="feed-list space-y-4" id="feed-list" role="list" aria-label="Activités">
      {activities.map((activity) => (
        <li class="feed-card bg-surface border border-border rounded-xl p-4">
          <div class="flex items-start gap-3">
            <a href={`/u/${activity.user.username}`} aria-label={activity.user.name ?? activity.user.username}>
              {activity.user.image
                ? <img src={activity.user.image} alt={activity.user.name ?? ''} width="40" height="40" class="rounded-full w-10 h-10 object-cover" />
                : <div class="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center text-sm font-medium">{(activity.user.name ?? 'U')[0]}</div>
              }
            </a>
            <div class="flex-1 min-w-0">
              <p class="text-sm">
                <a href={`/u/${activity.user.username}`} class="font-medium hover:underline">{activity.user.name}</a>
                {activity.type === 'ADD_ITEM' && ' a ajouté un disque à sa shelf'}
                {activity.type === 'ADD_WANT' && ' veut ce disque'}
                {activity.type === 'RATE_ITEM' && ' a noté un disque'}
                {activity.type === 'CREATE_COLLECTION' && ' a créé une collection'}
                {activity.type === 'ADD_TO_COLLECTION' && ' a ajouté un disque à une collection'}
                {activity.type === 'FOLLOW_USER' && ' suit quelqu\'un de nouveau'}
              </p>
              {activity.shelfItem?.release && (
                <a href={`/items/${activity.shelfItem.id}`} class="flex items-center gap-3 mt-2 p-2 rounded-lg hover:bg-surface-raised transition-colors">
                  {activity.shelfItem.release.coverUrl && (
                    <img
                      src={activity.shelfItem.release.coverUrl}
                      alt={`${activity.shelfItem.release.artist} — ${activity.shelfItem.release.title}`}
                      width="48"
                      height="48"
                      class="rounded w-12 h-12 object-cover"
                      loading="lazy"
                    />
                  )}
                  <div>
                    <p class="text-sm font-medium">{activity.shelfItem.release.title}</p>
                    <p class="text-xs text-muted">{activity.shelfItem.release.artist}</p>
                  </div>
                </a>
              )}
              <div class="flex items-center gap-4 mt-2 text-xs text-muted">
                <span>{new Date(activity.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                <span>{activity._count.likes} like{activity._count.likes !== 1 ? 's' : ''}</span>
                <span>{activity._count.comments} commentaire{activity._count.comments !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>

    {nextCursor && (
      <div id="load-more-trigger" class="text-center py-8">
        <button
          id="load-more-btn"
          class="btn-secondary"
          data-cursor={nextCursor}
        >
          Charger plus
        </button>
      </div>
    )}
  </div>
</Layout>

<script>
  const btn = document.getElementById('load-more-btn') as HTMLButtonElement | null
  const list = document.getElementById('feed-list')

  btn?.addEventListener('click', async () => {
    const cursor = btn.dataset.cursor
    if (!cursor || !list) return

    btn.disabled = true
    btn.textContent = 'Chargement…'

    try {
      const res = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`)
      const data = await res.json()

      for (const activity of data.activities) {
        const li = document.createElement('li')
        li.className = 'feed-card bg-surface border border-border rounded-xl p-4'
        li.innerHTML = `
          <a href="/items/${activity.shelfItem?.id ?? '#'}" class="flex items-center gap-3">
            ${activity.shelfItem?.release?.coverUrl ? `<img src="${activity.shelfItem.release.coverUrl}" alt="${activity.shelfItem.release.artist} — ${activity.shelfItem.release.title}" width="48" height="48" class="rounded w-12 h-12 object-cover" loading="lazy" />` : ''}
            <div>
              <p class="text-sm font-medium">${activity.shelfItem?.release?.title ?? ''}</p>
              <p class="text-xs text-muted">${activity.shelfItem?.release?.artist ?? ''}</p>
            </div>
          </a>
        `
        list.appendChild(li)
      }

      if (data.nextCursor) {
        btn.dataset.cursor = data.nextCursor
        btn.disabled = false
        btn.textContent = 'Charger plus'
      } else {
        btn.closest('#load-more-trigger')?.remove()
      }
    } catch {
      btn.disabled = false
      btn.textContent = 'Réessayer'
    }
  })
</script>
```

- [ ] **Step 4.2: Verify build**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | grep -v "node_modules" | head -20
```

Expected: no errors.

- [ ] **Step 4.3: Commit**

```bash
git add src/pages/feed.astro
git commit -m "feat(feed): add feed page with cursor-based infinite scroll"
```

---

## Task 5: Public profile page `/u/[username]`

**Files:**
- Create: `src/pages/u/[username].astro`

- [ ] **Step 5.1: Create the profile page**

```astro
---
import Layout from '../../components/layouts/Layout.astro'
import { userRepository } from '../../repositories/user-repository'
import { followRepository } from '../../repositories/follow-repository'
import { shelfItemRepository } from '../../repositories/shelf-item-repository'
import { collectionRepository } from '../../repositories/collection-repository'
import { auth } from '../../lib/auth'

const { username } = Astro.params
if (!username) return Astro.redirect('/explore')

const session = await auth.api.getSession({ headers: Astro.request.headers })
const currentUserId = session?.user?.id ?? null

const profileUser = await userRepository.findByUsername(username)
if (!profileUser) return Astro.redirect('/explore')

// Privacy: if account is private and viewer is not a follower (and not self), show limited view
const isSelf = currentUserId === profileUser.id
const isFollowing = currentUserId && !isSelf
  ? await followRepository.isFollowing(currentUserId, profileUser.id)
  : false

const isPrivate = profileUser.isPrivate ?? false
const canViewFull = isSelf || !isPrivate || isFollowing

// Load stats + recent items + pinned collections in parallel
const [followers, following, shelfCount, recentItems, pinnedCollections, wantCount] =
  canViewFull
    ? await Promise.all([
        followRepository.getFollowers(profileUser.id),
        followRepository.getFollowing(profileUser.id),
        shelfItemRepository.countByUser(profileUser.id),
        shelfItemRepository.getRecent(profileUser.id, 6),
        collectionRepository.getPinned(profileUser.id),
        userRepository.countWants(profileUser.id),
      ])
    : await Promise.all([
        followRepository.getFollowers(profileUser.id),
        followRepository.getFollowing(profileUser.id),
        Promise.resolve(0),
        Promise.resolve([]),
        Promise.resolve([]),
        Promise.resolve(0),
      ])

// Set noindex if private
if (isPrivate) {
  Astro.response.headers.set('X-Robots-Tag', 'noindex')
}
---

<Layout title={profileUser.name ?? username}>
  {isPrivate && <meta name="robots" content="noindex" slot="head" />}

  <div class="profile-page max-w-2xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-start gap-4 mb-6">
      {profileUser.image
        ? <img src={profileUser.image} alt={profileUser.name ?? username} width="80" height="80" class="rounded-full w-20 h-20 object-cover" />
        : <div class="w-20 h-20 rounded-full bg-surface-raised flex items-center justify-center text-2xl font-bold">{(profileUser.name ?? username)[0]}</div>
      }
      <div class="flex-1 min-w-0">
        <h1 class="text-xl font-semibold">{profileUser.name ?? username}</h1>
        <p class="text-sm text-muted">@{username}</p>
        {profileUser.bio && <p class="text-sm mt-1">{profileUser.bio}</p>}

        <div class="flex items-center gap-2 mt-3">
          {!isSelf && currentUserId && (
            <button
              class="btn-primary follow-btn"
              data-username={username}
              data-following={isFollowing ? 'true' : 'false'}
              aria-pressed={isFollowing}
            >
              {isFollowing ? 'Abonné' : 'Suivre'}
            </button>
          )}
          {!isSelf && currentUserId && (
            <button class="btn-ghost p-2 context-menu-btn" aria-label="Plus d'actions" data-username={username}>
              ⋯
            </button>
          )}
          {isSelf && (
            <a href="/settings" class="btn-secondary text-sm">Modifier le profil</a>
          )}
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid grid grid-cols-5 gap-2 mb-6 text-center">
      <div>
        <p class="text-lg font-bold">{canViewFull ? shelfCount : '—'}</p>
        <p class="text-xs text-muted">Disques</p>
      </div>
      <div>
        <p class="text-lg font-bold">{canViewFull ? pinnedCollections.length : '—'}</p>
        <p class="text-xs text-muted">Collections</p>
      </div>
      <div>
        <p class="text-lg font-bold">{followers.length}</p>
        <p class="text-xs text-muted">Followers</p>
      </div>
      <div>
        <p class="text-lg font-bold">{following.length}</p>
        <p class="text-xs text-muted">Following</p>
      </div>
      <div>
        <p class="text-lg font-bold">{canViewFull ? wantCount : '—'}</p>
        <p class="text-xs text-muted">Wants</p>
      </div>
    </div>

    {!canViewFull && isPrivate && (
      <div class="private-notice text-center py-12 border border-border rounded-xl">
        <p class="font-medium mb-1">Compte privé</p>
        <p class="text-sm text-muted">Suis {profileUser.name ?? username} pour voir sa collection.</p>
      </div>
    )}

    {canViewFull && (
      <>
        <!-- Recent items -->
        {recentItems.length > 0 && (
          <section class="mb-6" aria-labelledby="recent-heading">
            <h2 id="recent-heading" class="text-sm font-medium text-muted mb-3">Récemment ajoutés</h2>
            <div class="grid grid-cols-3 gap-2">
              {recentItems.map((item) => (
                <a href={`/items/${item.id}`} class="aspect-square rounded overflow-hidden bg-surface-raised hover:opacity-90 transition-opacity">
                  {item.release.coverUrl
                    ? <img src={item.release.coverUrl} alt={`${item.release.artist} — ${item.release.title}`} width="120" height="120" class="w-full h-full object-cover" loading="lazy" />
                    : <div class="w-full h-full flex items-center justify-center text-xs text-muted p-2 text-center">{item.release.title}</div>
                  }
                </a>
              ))}
            </div>
          </section>
        )}

        <!-- Pinned collections -->
        {pinnedCollections.length > 0 && (
          <section aria-labelledby="collections-heading">
            <h2 id="collections-heading" class="text-sm font-medium text-muted mb-3">Collections</h2>
            <ul class="space-y-2">
              {pinnedCollections.map((col) => (
                <li>
                  <a href={`/u/${username}/collections/${col.slug}`} class="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-raised transition-colors">
                    <span class="font-medium text-sm">{col.name}</span>
                    <span class="text-xs text-muted">{col._count?.items ?? 0} disques</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    )}
  </div>
</Layout>

<script>
  // Follow/unfollow button
  const followBtn = document.querySelector('.follow-btn') as HTMLButtonElement | null
  followBtn?.addEventListener('click', async () => {
    const username = followBtn.dataset.username
    const isFollowing = followBtn.dataset.following === 'true'
    followBtn.disabled = true

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: 'POST' })
      const data = await res.json()
      followBtn.dataset.following = data.following ? 'true' : 'false'
      followBtn.setAttribute('aria-pressed', String(data.following))
      followBtn.textContent = data.following ? 'Abonné' : 'Suivre'
    } catch {
      // no-op
    } finally {
      followBtn.disabled = false
    }
  })

  // Block via context menu (⋯)
  const contextBtn = document.querySelector('.context-menu-btn') as HTMLButtonElement | null
  contextBtn?.addEventListener('click', async () => {
    const username = contextBtn.dataset.username
    if (!confirm(`Bloquer @${username} ?`)) return

    const res = await fetch(`/api/users/${username}/block`, { method: 'POST' })
    if (res.ok) window.location.href = '/feed'
  })
</script>
```

- [ ] **Step 5.2: Add missing repository methods**

The page requires:
- `shelfItemRepository.countByUser(userId)` — count shelf items for a user
- `shelfItemRepository.getRecent(userId, n)` — last n items with release
- `collectionRepository.getPinned(userId)` — pinned collections with item count
- `userRepository.countWants(userId)` — count wants

Add to `src/repositories/shelf-item-repository.ts` (from Plan 1):
```typescript
async countByUser(userId: string) {
  return db.shelfItem.count({ where: { userId } })
}

async getRecent(userId: string, take = 6) {
  return db.shelfItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    include: { release: { select: { title: true, artist: true, coverUrl: true } } },
  })
}
```

Add to `src/repositories/collection-repository.ts`:
```typescript
async getPinned(userId: string) {
  return db.collection.findMany({
    where: { userId, isPinned: true },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { items: true } } },
  })
}
```

Add to `src/repositories/user-repository.ts`:
```typescript
async countWants(userId: string) {
  return db.want.count({ where: { userId } })
}
```

- [ ] **Step 5.3: Add `/profile` 302 redirect**

Create `src/pages/profile.astro` (or update existing) to redirect to the user's own profile:

```astro
---
import { auth } from '../lib/auth'

const session = await auth.api.getSession({ headers: Astro.request.headers })
if (!session) return Astro.redirect('/login')

const username = session.user.username ?? session.user.id
return Astro.redirect(`/u/${username}`, 302)
---
```

- [ ] **Step 5.4: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 5.5: Commit**

```bash
git add src/pages/u/[username].astro src/pages/profile.astro \
  src/repositories/shelf-item-repository.ts \
  src/repositories/collection-repository.ts \
  src/repositories/user-repository.ts
git commit -m "feat(profile): add public profile page with privacy enforcement"
```

---

## Task 6: Item detail page `/items/[id]`

**Files:**
- Modify: `src/pages/items/[id].astro`

- [ ] **Step 6.1: Rewrite the item detail page for Release/ShelfItem architecture**

Read the current `src/pages/items/[id].astro` to understand what's there, then replace it with:

```astro
---
import Layout from '../../components/layouts/Layout.astro'
import { shelfItemRepository } from '../../repositories/shelf-item-repository'
import { followRepository } from '../../repositories/follow-repository'
import { auth } from '../../lib/auth'

const { id } = Astro.params
if (!id) return Astro.redirect('/shelf')

const session = await auth.api.getSession({ headers: Astro.request.headers })
const currentUserId = session?.user?.id ?? null

const shelfItem = await shelfItemRepository.findByIdWithRelease(id)
if (!shelfItem) return Astro.redirect('/shelf')

const isOwner = currentUserId === shelfItem.userId
const release = shelfItem.release

// If owner's account is private and viewer is not a follower, block access
if (!isOwner && shelfItem.user.isPrivate) {
  const canView = currentUserId
    ? await followRepository.isFollowing(currentUserId, shelfItem.userId)
    : false
  if (!canView) return Astro.redirect('/explore')
}

// Who among my follows also has this release?
const friendsWithRelease = currentUserId && !isOwner
  ? await shelfItemRepository.getFriendsWithRelease(currentUserId, release.id)
  : []

// Community avg rating (show only if 3+ ratings)
const showCommunityRating = (release.ratingCount ?? 0) >= 3
---

<Layout title={`${release.artist} — ${release.title}`}>
  <div class="item-detail max-w-2xl mx-auto px-4 py-6">

    <!-- Cover + meta -->
    <div class="flex items-start gap-4 mb-6">
      <div class="flex-shrink-0">
        {release.coverUrl
          ? <img
              src={release.coverUrl}
              alt={`${release.artist} — ${release.title}`}
              width="120"
              height="120"
              class="rounded-lg w-28 h-28 object-cover shadow"
            />
          : <div class="w-28 h-28 rounded-lg bg-surface-raised flex items-center justify-center text-muted text-xs">No cover</div>
        }
      </div>
      <div class="flex-1 min-w-0">
        <h1 class="text-lg font-semibold leading-tight">{release.title}</h1>
        <p class="text-sm text-muted">{release.artist}</p>
        {release.label && <p class="text-xs text-muted">{release.label}</p>}
        <div class="flex items-center gap-2 mt-1 text-xs text-muted">
          {release.year && <span>{release.year}</span>}
          {release.country && <span>· {release.country}</span>}
          <span>· {release.format}</span>
        </div>

        <!-- Owner rating -->
        {shelfItem.rating && (
          <div class="flex items-center gap-1 mt-2" aria-label={`Note : ${shelfItem.rating} sur 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span class={i < shelfItem.rating! ? 'text-accent' : 'text-muted'} aria-hidden="true">★</span>
            ))}
          </div>
        )}

        <!-- Community rating -->
        {showCommunityRating && (
          <p class="text-xs text-muted mt-1">
            Moyenne communauté : {release.avgRating?.toFixed(1)}/5
            ({release.ratingCount} notes)
          </p>
        )}
      </div>
    </div>

    <!-- Social: friends who have this -->
    {friendsWithRelease.length > 0 && (
      <div class="friends-section mb-4 p-3 bg-surface-raised rounded-lg">
        <p class="text-xs text-muted mb-2">
          {friendsWithRelease.length === 1
            ? '1 personne que tu suis a ce disque'
            : `${friendsWithRelease.length} personnes que tu suis ont ce disque`}
        </p>
        <div class="flex -space-x-2">
          {friendsWithRelease.slice(0, 5).map((f) => (
            <a href={`/u/${f.user.username}`} aria-label={f.user.name ?? f.user.username}>
              {f.user.image
                ? <img src={f.user.image} alt={f.user.name ?? ''} width="28" height="28" class="w-7 h-7 rounded-full border-2 border-background object-cover" />
                : <div class="w-7 h-7 rounded-full border-2 border-background bg-accent flex items-center justify-center text-xs font-bold">{(f.user.name ?? 'U')[0]}</div>
              }
            </a>
          ))}
        </div>
      </div>
    )}

    <!-- Personal info (owner only) -->
    {isOwner && (
      <section class="personal-info mb-6 p-4 bg-surface border border-border rounded-xl">
        <h2 class="text-sm font-medium mb-3">Ma collection</h2>
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-muted">État</dt>
            <dd>{shelfItem.condition}</dd>
          </div>
          {shelfItem.acquiredAt && (
            <div class="flex justify-between">
              <dt class="text-muted">Acquis le</dt>
              <dd>{new Date(shelfItem.acquiredAt).toLocaleDateString('fr-FR')}</dd>
            </div>
          )}
          {shelfItem.note && (
            <div>
              <dt class="text-muted mb-1">Note personnelle</dt>
              <dd class="text-sm">{shelfItem.note}</dd>
            </div>
          )}
        </dl>
      </section>
    )}

    <!-- Tracklist -->
    {release.tracklist && Array.isArray(release.tracklist) && release.tracklist.length > 0 && (
      <section class="tracklist mb-6" aria-labelledby="tracklist-heading">
        <h2 id="tracklist-heading" class="text-sm font-medium text-muted mb-2">Tracklist</h2>
        <ol class="space-y-1">
          {(release.tracklist as Array<{ position: string; title: string; duration?: string }>).map((track) => (
            <li class="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
              <span class="text-muted w-8 flex-shrink-0">{track.position}</span>
              <span class="flex-1">{track.title}</span>
              {track.duration && <span class="text-muted text-xs">{track.duration}</span>}
            </li>
          ))}
        </ol>
      </section>
    )}

    <!-- Actions -->
    <div class="actions flex gap-2 flex-wrap">
      {!isOwner && currentUserId && (
        <button
          class="btn-secondary want-btn"
          data-release-id={release.id}
        >
          + Want
        </button>
      )}
      {isOwner && (
        <>
          <a href={`/items/${id}/edit`} class="btn-secondary">Modifier</a>
          <button class="btn-ghost text-red-500 delete-btn" data-id={id}>Supprimer</button>
        </>
      )}
    </div>
  </div>
</Layout>

<script>
  // Want button
  const wantBtn = document.querySelector('.want-btn') as HTMLButtonElement | null
  wantBtn?.addEventListener('click', async () => {
    const releaseId = wantBtn.dataset.releaseId
    wantBtn.disabled = true
    try {
      const res = await fetch('/api/wants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId }),
      })
      if (res.ok) {
        wantBtn.textContent = '✓ Dans mes Wants'
        wantBtn.disabled = true
      }
    } catch {
      wantBtn.disabled = false
    }
  })

  // Delete button
  const deleteBtn = document.querySelector('.delete-btn') as HTMLButtonElement | null
  deleteBtn?.addEventListener('click', async () => {
    if (!confirm('Supprimer ce disque de ta shelf ?')) return
    const id = deleteBtn.dataset.id
    const res = await fetch(`/api/items/${id}/delete`, { method: 'DELETE' })
    if (res.ok) window.location.href = '/shelf'
  })
</script>
```

- [ ] **Step 6.2: Add `findByIdWithRelease` and `getFriendsWithRelease` to `shelf-item-repository.ts`**

```typescript
async findByIdWithRelease(id: string) {
  return db.shelfItem.findUnique({
    where: { id },
    include: {
      release: true,
      user: { select: { id: true, name: true, image: true, username: true, isPrivate: true } },
    },
  })
}

async getFriendsWithRelease(currentUserId: string, releaseId: string) {
  const follows = await db.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true },
  })
  const followingIds = follows.map((f) => f.followingId)

  return db.shelfItem.findMany({
    where: { releaseId, userId: { in: followingIds } },
    include: {
      user: { select: { id: true, name: true, image: true, username: true } },
    },
    take: 5,
  })
}
```

- [ ] **Step 6.3: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 6.4: Run smoke tests**

```bash
pnpm e2e:smoke
```

Expected: all smoke tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/pages/items/[id].astro src/repositories/shelf-item-repository.ts
git commit -m "feat(items): rewrite item detail page for Release/ShelfItem architecture"
```

---

## Self-Review

**Spec coverage:**
- ✅ Cursor-based feed with composite cursor (section 4, 27) — Tasks 1, 2
- ✅ Empty feed state with suggestions (section 4) — Task 4
- ✅ `Promise.all` for profile stats (section 27) — Task 5
- ✅ Privacy enforcement on profile (section 18) — Task 5
- ✅ `noindex` for private profiles (section 20) — Task 5
- ✅ Follow/unfollow button on profile (section 6) — Task 5
- ✅ Block via ⋯ menu (section 24) — Task 5
- ✅ Item detail: public metadata from Release (section 10) — Task 6
- ✅ Item detail: personal info owner-only (section 10) — Task 6
- ✅ Community rating (min 3, denormalized) (section 10, 27) — Task 6
- ✅ Friends who have this release (section 10) — Task 6
- ✅ `/profile` 302 redirect (section 25) — Task 5
- ✅ findOrCreateFromDiscogs (section 11) — Task 3

**Missing (covered in other plans):**
- Rating edit from item detail (Plan 5 — ShelfItem update)
- Add to collection from item detail (Plan 5 — Collections)
- Notification badge in bottom bar/header (Plan 6 — UI)
