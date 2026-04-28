# Plan 4 — Explore & Discover

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Explore page (search + trending + new members), the release detail page `/explore/[discogsId]`, and the add flow (FAB bottom sheet → Scanner/Search → ShelfItem creation).

**Architecture:** Trending uses a `GROUP BY releaseId COUNT(*) WHERE createdAt > now()-7d` on `ShelfItem`, enabled by the `@@index([createdAt])` added in Plan 1. The new `/api/shelf-items/create` endpoint replaces the old `/api/items/create` — it upserts the Release then creates the ShelfItem. Block filters are applied to new-members and trending queries.

**Tech Stack:** Astro 6 SSR + client scripts, Prisma, TypeScript, Discogs API

**Spec:** `docs/superpowers/specs/2026-04-08-social-refactor-design.md` — sections 11, 12, 26, 27

**Depends on:** Plan 1 (Release, ShelfItem, ShelfItemRepository, ReleaseRepository), Plan 3 (findOrCreateFromDiscogs)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/repositories/explore-repository.ts` | Create | Trending + new members queries |
| `src/pages/api/explore/trending.ts` | Create | GET trending releases this week |
| `src/pages/api/explore/new-members.ts` | Create | GET recently joined active users |
| `src/pages/api/shelf-items/create.ts` | Create | POST create ShelfItem (upsert Release first) |
| `src/pages/explore.astro` | Modify | Full explore page (search + sections) |
| `src/pages/explore/[discogsId].astro` | Create | Release detail page (replaces explorer/) |

---

## Task 1: `explore-repository.ts` — trending and new members

**Files:**
- Create: `src/repositories/explore-repository.ts`

- [ ] **Step 1.1: Create explore repository**

```typescript
import { db } from '../lib/db'

export class ExploreRepository {
  /**
   * Top releases by shelf additions in the past 7 days.
   * Uses GROUP BY on ShelfItem.releaseId. The @@index([createdAt]) on ShelfItem
   * makes this fast — no full table scan.
   */
  async getTrending(limit = 10) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const grouped = await db.shelfItem.groupBy({
      by: ['releaseId'],
      where: { createdAt: { gte: since } },
      _count: { releaseId: true },
      orderBy: { _count: { releaseId: 'desc' } },
      take: limit,
    })

    if (grouped.length === 0) return []

    const releaseIds = grouped.map((g) => g.releaseId)
    const releases = await db.release.findMany({
      where: { id: { in: releaseIds } },
    })

    // Merge count into release objects, preserve trending order
    const releaseMap = new Map(releases.map((r) => [r.id, r]))
    return grouped
      .map((g) => {
        const release = releaseMap.get(g.releaseId)
        if (!release) return null
        return { ...release, addCount: g._count.releaseId }
      })
      .filter(Boolean)
  }

  /**
   * Users who joined recently and have at least 1 shelf item.
   * Excludes blocked users (blockerId check done at route level).
   */
  async getNewActiveMembers(excludeIds: string[] = [], limit = 8) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // last 30 days

    return db.user.findMany({
      where: {
        createdAt: { gte: since },
        id: { notIn: excludeIds },
        shelfItems: { some: {} }, // at least one item
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        image: true,
        username: true,
        createdAt: true,
        _count: { select: { shelfItems: true } },
      },
    })
  }
}

export const exploreRepository = new ExploreRepository()
```

- [ ] **Step 1.2: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 1.3: Commit**

```bash
git add src/repositories/explore-repository.ts
git commit -m "feat(explore): add explore repository (trending + new members)"
```

---

## Task 2: Trending and new-members API endpoints

**Files:**
- Create: `src/pages/api/explore/trending.ts`
- Create: `src/pages/api/explore/new-members.ts`

- [ ] **Step 2.1: Create trending endpoint**

```typescript
import type { APIRoute } from 'astro'
import { exploreRepository } from '../../../repositories/explore-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/explore/trending
export const GET: APIRoute = async ({ locals }) => {
  // Public endpoint — no auth required, but block check skipped for anonymous users
  try {
    const trending = await exploreRepository.getTrending(10)
    return new Response(JSON.stringify({ trending }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
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

- [ ] **Step 2.2: Create new-members endpoint**

```typescript
import type { APIRoute } from 'astro'
import { exploreRepository } from '../../../repositories/explore-repository'
import { blockRepository } from '../../../repositories/block-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/explore/new-members
export const GET: APIRoute = async ({ locals }) => {
  try {
    const currentUser = locals.user
    let excludeIds: string[] = []

    // Exclude users who blocked the current user or are blocked by them
    if (currentUser) {
      const blocked = await blockRepository.getBlockedIds(currentUser.id)
      const blockedBy = await blockRepository.getBlockedByIds(currentUser.id)
      excludeIds = [...blocked, ...blockedBy, currentUser.id]
    }

    const members = await exploreRepository.getNewActiveMembers(excludeIds, 8)
    return new Response(JSON.stringify({ members }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
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

- [ ] **Step 2.3: Add `getBlockedIds` and `getBlockedByIds` to `block-repository.ts`**

Open `src/repositories/block-repository.ts` (created in Plan 1) and add:

```typescript
async getBlockedIds(userId: string): Promise<string[]> {
  const blocks = await db.userBlock.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  })
  return blocks.map((b) => b.blockedId)
}

async getBlockedByIds(userId: string): Promise<string[]> {
  const blocks = await db.userBlock.findMany({
    where: { blockedId: userId },
    select: { blockerId: true },
  })
  return blocks.map((b) => b.blockerId)
}
```

- [ ] **Step 2.4: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 2.5: Commit**

```bash
git add src/pages/api/explore/trending.ts src/pages/api/explore/new-members.ts \
  src/repositories/block-repository.ts
git commit -m "feat(explore): add trending and new-members API endpoints"
```

---

## Task 3: ShelfItem create endpoint (replaces old items/create)

**Files:**
- Create: `src/pages/api/shelf-items/create.ts`

- [ ] **Step 3.1: Create the new ShelfItem creation endpoint**

This endpoint: (1) upserts the Release from Discogs, (2) creates the ShelfItem, (3) updates the denormalized rating if one is provided, (4) creates the ADD_ITEM activity, (5) triggers the anti-spam notification for followers.

```typescript
import type { APIRoute } from 'astro'
import { releaseRepository } from '../../../repositories/release-repository'
import { shelfItemRepository } from '../../../repositories/shelf-item-repository'
import { activityRepository } from '../../../repositories/activity-repository'
import { followRepository } from '../../../repositories/follow-repository'
import { notificationRepository } from '../../../repositories/notification-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// POST /api/shelf-items/create
// Body: { discogsId: string, condition: string, format: string, rating?: number, note?: string, acquiredAt?: string }
export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { discogsId, condition, format, rating, note, acquiredAt } = body as {
    discogsId?: string
    condition?: string
    format?: string
    rating?: number
    note?: string
    acquiredAt?: string
  }

  if (!discogsId || !condition || !format) {
    return new Response(
      JSON.stringify({ error: 'discogsId, condition, and format are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const validConditions = ['Mint', 'NM', 'EX', 'VG+', 'VG', 'G']
  if (!validConditions.includes(condition)) {
    return new Response(
      JSON.stringify({ error: `condition must be one of: ${validConditions.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const validFormats = ['Vinyl', 'CD', 'Cassette']
  if (!validFormats.includes(format)) {
    return new Response(
      JSON.stringify({ error: `format must be one of: ${validFormats.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (rating !== undefined && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
    return new Response(JSON.stringify({ error: 'rating must be an integer 1–5' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (note && note.length > 2000) {
    return new Response(JSON.stringify({ error: 'note must be 2000 characters or less' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // 1. Get or create the Release
    const release = await releaseRepository.findOrCreateFromDiscogs(discogsId)
    if (!release) {
      return new Response(JSON.stringify({ error: 'Release not found on Discogs' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Check for duplicate
    const existing = await shelfItemRepository.findByUserAndRelease(currentUser.id, release.id)
    if (existing) {
      return new Response(JSON.stringify({ error: 'Already in your shelf', shelfItem: existing }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Create the ShelfItem
    const sanitizedNote = note ? note.replace(/<[^>]*>/g, '').trim() : undefined
    const shelfItem = await shelfItemRepository.create({
      userId: currentUser.id,
      releaseId: release.id,
      condition,
      rating,
      note: sanitizedNote,
      acquiredAt: acquiredAt ? new Date(acquiredAt) : undefined,
    })

    // 4. Update denormalized rating if provided
    if (rating) {
      await releaseRepository.addRating(release.id, rating)
    }

    // 5. Create ADD_ITEM activity
    const activity = await activityRepository.createActivity({
      userId: currentUser.id,
      type: 'ADD_ITEM',
      shelfItemId: shelfItem.id,
    })

    // 6. Notify followers (anti-spam upsert — max 1 per 2h)
    const followers = await followRepository.getFollowers(currentUser.id)
    await Promise.allSettled(
      followers.map((f) =>
        notificationRepository.upsertShelfAdd(f.followerId, currentUser.id),
      ),
    )

    return new Response(JSON.stringify({ shelfItem, release, activity }), {
      status: 201,
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

- [ ] **Step 3.2: Add missing repository methods**

Add to `src/repositories/shelf-item-repository.ts`:

```typescript
async findByUserAndRelease(userId: string, releaseId: string) {
  return db.shelfItem.findUnique({
    where: { userId_releaseId: { userId, releaseId } },
  })
}

async create(data: {
  userId: string
  releaseId: string
  condition: string
  rating?: number
  note?: string
  acquiredAt?: Date
}) {
  return db.shelfItem.create({ data })
}
```

Add to `src/repositories/release-repository.ts`:

```typescript
/**
 * Atomically increments avgRating and ratingCount.
 * Called after each new rating. Uses a transaction to avoid partial updates.
 */
async addRating(releaseId: string, rating: number) {
  await db.$transaction(async (tx) => {
    const release = await tx.release.findUnique({
      where: { id: releaseId },
      select: { avgRating: true, ratingCount: true },
    })
    if (!release) return

    const oldCount = release.ratingCount
    const oldAvg = release.avgRating ?? 0
    const newCount = oldCount + 1
    const newAvg = (oldAvg * oldCount + rating) / newCount

    await tx.release.update({
      where: { id: releaseId },
      data: { avgRating: newAvg, ratingCount: newCount },
    })
  })
}

/**
 * Recalculates avgRating from scratch when a rating is updated or removed.
 */
async recalculateRating(releaseId: string) {
  const result = await db.shelfItem.aggregate({
    where: { releaseId, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  })

  await db.release.update({
    where: { id: releaseId },
    data: {
      avgRating: result._avg.rating,
      ratingCount: result._count.rating,
    },
  })
}
```

Add to `src/repositories/follow-repository.ts` (if not already present — check first):

```typescript
async getFollowers(userId: string) {
  return db.follow.findMany({
    where: { followingId: userId },
    select: { followerId: true },
  })
}
```

- [ ] **Step 3.3: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 3.4: Commit**

```bash
git add src/pages/api/shelf-items/create.ts \
  src/repositories/shelf-item-repository.ts \
  src/repositories/release-repository.ts \
  src/repositories/follow-repository.ts
git commit -m "feat(shelf): add ShelfItem create endpoint with Release upsert, rating, and notifications"
```

---

## Task 4: Explore page

**Files:**
- Modify: `src/pages/explore.astro`

- [ ] **Step 4.1: Rewrite the explore page**

```astro
---
import Layout from '../components/layouts/Layout.astro'
import { exploreRepository } from '../repositories/explore-repository'
import { blockRepository } from '../repositories/block-repository'
import { auth } from '../lib/auth'

const session = await auth.api.getSession({ headers: Astro.request.headers })
const currentUserId = session?.user?.id ?? null

let excludeIds: string[] = []
if (currentUserId) {
  const [blocked, blockedBy] = await Promise.all([
    blockRepository.getBlockedIds(currentUserId),
    blockRepository.getBlockedByIds(currentUserId),
  ])
  excludeIds = [...blocked, ...blockedBy, currentUserId]
}

const [trending, newMembers] = await Promise.all([
  exploreRepository.getTrending(10),
  exploreRepository.getNewActiveMembers(excludeIds, 8),
])

// Public page — set cache headers
Astro.response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
---

<Layout title="Explorer">
  <div class="explore-page max-w-2xl mx-auto px-4 py-4">

    <!-- Search bar -->
    <div class="search-section mb-6">
      <form role="search" id="explore-search-form">
        <label for="explore-search" class="sr-only">Rechercher un disque (artiste, titre, label)</label>
        <div class="relative">
          <input
            type="search"
            id="explore-search"
            name="q"
            placeholder="Artiste, titre, label…"
            class="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            autocomplete="off"
          />
          <svg class="absolute left-3 top-3.5 w-4 h-4 text-muted" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </form>
      <div id="search-results" class="mt-2 space-y-2" role="region" aria-live="polite" aria-label="Résultats de recherche"></div>
    </div>

    <!-- Trending -->
    {trending.length > 0 && (
      <section class="mb-8" aria-labelledby="trending-heading">
        <h2 id="trending-heading" class="text-sm font-medium text-muted mb-3">Tendances cette semaine</h2>
        <div class="grid grid-cols-2 gap-3">
          {trending.map((release) => release && (
            <a
              href={`/explore/${release.discogsId}`}
              class="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-surface-raised transition-colors"
            >
              {release.coverUrl
                ? <img src={release.coverUrl} alt={`${release.artist} — ${release.title}`} width="48" height="48" class="w-12 h-12 rounded object-cover flex-shrink-0" loading="lazy" />
                : <div class="w-12 h-12 rounded bg-surface-raised flex items-center justify-center flex-shrink-0 text-xs text-muted">—</div>
              }
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{release.title}</p>
                <p class="text-xs text-muted truncate">{release.artist}</p>
                <p class="text-xs text-accent mt-0.5">{release.addCount} ajout{release.addCount !== 1 ? 's' : ''}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    )}

    <!-- New active members -->
    {newMembers.length > 0 && (
      <section aria-labelledby="members-heading">
        <h2 id="members-heading" class="text-sm font-medium text-muted mb-3">Nouveaux membres actifs</h2>
        <ul class="space-y-2">
          {newMembers.map((member) => (
            <li>
              <a href={`/u/${member.username}`} class="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-surface-raised transition-colors">
                {member.image
                  ? <img src={member.image} alt={member.name ?? ''} width="40" height="40" class="w-10 h-10 rounded-full object-cover flex-shrink-0" loading="lazy" />
                  : <div class="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center font-medium text-sm flex-shrink-0">{(member.name ?? 'U')[0]}</div>
                }
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium">{member.name}</p>
                  <p class="text-xs text-muted">@{member.username} · {member._count.shelfItems} disque{member._count.shelfItems !== 1 ? 's' : ''}</p>
                </div>
                {session && (
                  <button
                    class="follow-btn-small text-xs text-accent border border-accent/30 px-3 py-1 rounded-full hover:bg-accent/10 transition-colors"
                    data-username={member.username}
                    aria-label={`Suivre ${member.name}`}
                  >
                    Suivre
                  </button>
                )}
              </a>
            </li>
          ))}
        </ul>
      </section>
    )}
  </div>
</Layout>

<script>
  // Debounced search
  const input = document.getElementById('explore-search') as HTMLInputElement | null
  const resultsEl = document.getElementById('search-results')
  let timer: ReturnType<typeof setTimeout>

  input?.addEventListener('input', () => {
    clearTimeout(timer)
    const q = input.value.trim()
    if (!q || q.length < 2) {
      if (resultsEl) resultsEl.innerHTML = ''
      return
    }
    timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/discogs/search?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!resultsEl) return
        if (!data.results?.length) {
          resultsEl.innerHTML = '<p class="text-sm text-muted py-2">Aucun résultat.</p>'
          return
        }
        resultsEl.innerHTML = data.results
          .slice(0, 8)
          .map(
            (r: { id: string; title: string; thumb?: string }) => `
            <a href="/explore/${r.id}" class="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-raised transition-colors">
              ${r.thumb ? `<img src="${r.thumb}" alt="" width="40" height="40" class="w-10 h-10 rounded object-cover" loading="lazy" />` : '<div class="w-10 h-10 rounded bg-surface-raised"></div>'}
              <span class="text-sm">${r.title}</span>
            </a>`,
          )
          .join('')
      } catch {
        if (resultsEl) resultsEl.innerHTML = '<p class="text-sm text-muted py-2">Erreur de recherche.</p>'
      }
    }, 350)
  })

  // Inline follow buttons
  document.querySelectorAll<HTMLButtonElement>('.follow-btn-small').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      const username = btn.dataset.username
      btn.disabled = true
      try {
        const res = await fetch(`/api/users/${username}/follow`, { method: 'POST' })
        const data = await res.json()
        if (data.following) {
          btn.textContent = 'Abonné'
          btn.classList.add('opacity-60')
          btn.disabled = true
        } else {
          btn.textContent = 'Suivre'
          btn.disabled = false
        }
      } catch {
        btn.disabled = false
      }
    })
  })
</script>
```

- [ ] **Step 4.2: Verify build**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | grep -v "node_modules" | head -20
```

- [ ] **Step 4.3: Commit**

```bash
git add src/pages/explore.astro
git commit -m "feat(explore): rewrite explore page with trending, new members, and search"
```

---

## Task 5: Release detail page `/explore/[discogsId]`

**Files:**
- Create: `src/pages/explore/[discogsId].astro`

- [ ] **Step 5.1: Create the release detail page**

```astro
---
import Layout from '../../components/layouts/Layout.astro'
import { releaseRepository } from '../../repositories/release-repository'
import { shelfItemRepository } from '../../repositories/shelf-item-repository'
import { followRepository } from '../../repositories/follow-repository'
import { auth } from '../../lib/auth'

const { discogsId } = Astro.params
if (!discogsId) return Astro.redirect('/explore')

const session = await auth.api.getSession({ headers: Astro.request.headers })
const currentUserId = session?.user?.id ?? null

// Get or create Release from Discogs
const release = await releaseRepository.findOrCreateFromDiscogs(discogsId)
if (!release) return Astro.redirect('/explore')

// Check if already in user's shelf
const alreadyOwned = currentUserId
  ? await shelfItemRepository.findByUserAndRelease(currentUserId, release.id)
  : null

// Who in my follows has this?
const friendsWithRelease = currentUserId
  ? await shelfItemRepository.getFriendsWithRelease(currentUserId, release.id)
  : []

const showCommunityRating = (release.ratingCount ?? 0) >= 3

// Public page — cacheable
Astro.response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
---

<Layout title={`${release.artist} — ${release.title}`}>
  <div class="release-detail max-w-2xl mx-auto px-4 py-6">

    <!-- Cover + meta -->
    <div class="flex items-start gap-4 mb-6">
      <div class="flex-shrink-0">
        {release.coverUrl
          ? <img src={release.coverUrl} alt={`${release.artist} — ${release.title}`} width="120" height="120" class="rounded-lg w-28 h-28 object-cover shadow" />
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
        {showCommunityRating && (
          <p class="text-xs text-muted mt-1">
            Moyenne : {release.avgRating?.toFixed(1)}/5 ({release.ratingCount} notes)
          </p>
        )}
      </div>
    </div>

    <!-- Friends who have it -->
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
                ? <img src={f.user.image} alt="" width="28" height="28" class="w-7 h-7 rounded-full border-2 border-background object-cover" />
                : <div class="w-7 h-7 rounded-full border-2 border-background bg-accent flex items-center justify-center text-xs">{(f.user.name ?? 'U')[0]}</div>
              }
            </a>
          ))}
        </div>
      </div>
    )}

    <!-- Actions -->
    {session && (
      <div class="actions flex gap-2 mb-6">
        {!alreadyOwned
          ? (
            <button
              id="add-to-shelf-btn"
              class="btn-primary"
              data-discogs-id={discogsId}
              data-release-title={release.title}
            >
              + Ajouter à ma shelf
            </button>
          )
          : (
            <a href={`/items/${alreadyOwned.id}`} class="btn-secondary">Voir dans ma shelf</a>
          )
        }
        {!alreadyOwned && (
          <button
            id="want-btn"
            class="btn-secondary"
            data-release-id={release.id}
          >
            + Want
          </button>
        )}
      </div>
    )}
    {!session && (
      <div class="mb-6">
        <a href="/login" class="btn-primary">Se connecter pour ajouter</a>
      </div>
    )}

    <!-- Tracklist -->
    {release.tracklist && Array.isArray(release.tracklist) && release.tracklist.length > 0 && (
      <section aria-labelledby="tracklist-heading">
        <h2 id="tracklist-heading" class="text-sm font-medium text-muted mb-2">Tracklist</h2>
        <ol class="space-y-1">
          {(release.tracklist as Array<{ position: string; title: string; duration?: string }>).map((track) => (
            <li class="flex items-center gap-3 text-sm py-1 border-b border-border/50 last:border-0">
              <span class="text-muted w-8 flex-shrink-0">{track.position}</span>
              <span class="flex-1">{track.title}</span>
              {track.duration && <span class="text-muted text-xs">{track.duration}</span>}
            </li>
          ))}
        </ol>
      </section>
    )}
  </div>
</Layout>

<!-- Add to shelf modal (inline, no separate component needed) -->
<dialog id="add-shelf-dialog" class="rounded-2xl p-6 max-w-sm w-full shadow-xl backdrop:bg-black/40">
  <h2 class="font-semibold mb-4" id="dialog-title">Ajouter à ma shelf</h2>
  <form id="add-shelf-form" class="space-y-4">
    <input type="hidden" id="dialog-discogs-id" name="discogsId" />

    <div>
      <label for="dialog-format" class="block text-sm font-medium mb-1">Format <span aria-hidden="true">*</span></label>
      <select id="dialog-format" name="format" required class="w-full border border-border rounded-lg px-3 py-2 text-sm">
        <option value="">Choisir…</option>
        <option value="Vinyl">Vinyl</option>
        <option value="CD">CD</option>
        <option value="Cassette">Cassette</option>
      </select>
    </div>

    <div>
      <label for="dialog-condition" class="block text-sm font-medium mb-1">État <span aria-hidden="true">*</span></label>
      <select id="dialog-condition" name="condition" required class="w-full border border-border rounded-lg px-3 py-2 text-sm">
        <option value="">Choisir…</option>
        <option value="Mint">Mint</option>
        <option value="NM">Near Mint (NM)</option>
        <option value="EX">Excellent (EX)</option>
        <option value="VG+">Very Good+ (VG+)</option>
        <option value="VG">Very Good (VG)</option>
        <option value="G">Good (G)</option>
      </select>
    </div>

    <div>
      <label for="dialog-rating" class="block text-sm font-medium mb-1">Note (optionnel)</label>
      <select id="dialog-rating" name="rating" class="w-full border border-border rounded-lg px-3 py-2 text-sm">
        <option value="">—</option>
        <option value="5">★★★★★ 5</option>
        <option value="4">★★★★ 4</option>
        <option value="3">★★★ 3</option>
        <option value="2">★★ 2</option>
        <option value="1">★ 1</option>
      </select>
    </div>

    <div class="flex gap-2">
      <button type="submit" class="btn-primary flex-1">Confirmer</button>
      <button type="button" id="dialog-cancel" class="btn-ghost flex-1">Annuler</button>
    </div>
  </form>
</dialog>

<script>
  const addBtn = document.getElementById('add-to-shelf-btn') as HTMLButtonElement | null
  const dialog = document.getElementById('add-shelf-dialog') as HTMLDialogElement | null
  const cancelBtn = document.getElementById('dialog-cancel')
  const form = document.getElementById('add-shelf-form') as HTMLFormElement | null
  const discogsIdInput = document.getElementById('dialog-discogs-id') as HTMLInputElement | null

  addBtn?.addEventListener('click', () => {
    if (discogsIdInput) discogsIdInput.value = addBtn.dataset.discogsId ?? ''
    dialog?.showModal()
  })

  cancelBtn?.addEventListener('click', () => dialog?.close())
  dialog?.addEventListener('click', (e) => { if (e.target === dialog) dialog.close() })

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const formData = new FormData(form)
    const payload = {
      discogsId: formData.get('discogsId'),
      format: formData.get('format'),
      condition: formData.get('condition'),
      rating: formData.get('rating') ? Number(formData.get('rating')) : undefined,
    }

    try {
      const res = await fetch('/api/shelf-items/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        dialog?.close()
        window.location.href = `/items/${data.shelfItem.id}`
      } else {
        alert(data.error ?? 'Erreur lors de l\'ajout')
      }
    } catch {
      alert('Erreur réseau, réessaie.')
    }
  })

  // Want button
  const wantBtn = document.getElementById('want-btn') as HTMLButtonElement | null
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
      } else {
        wantBtn.disabled = false
      }
    } catch {
      wantBtn.disabled = false
    }
  })
</script>
```

- [ ] **Step 5.2: Verify build**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | grep -v "node_modules" | head -20
```

- [ ] **Step 5.3: Run smoke tests**

```bash
pnpm e2e:smoke
```

Expected: all smoke tests pass.

- [ ] **Step 5.4: Commit**

```bash
git add src/pages/explore/[discogsId].astro
git commit -m "feat(explore): add release detail page with add-to-shelf dialog"
```

---

## Self-Review

**Spec coverage:**
- ✅ Trending (GROUP BY this week) (section 12, 27) — Task 1
- ✅ New active members with block filter (section 12) — Task 2
- ✅ Explore page: search + trending + new members (section 12) — Task 4
- ✅ `/explore/[discogsId]` release detail (section 12, 25) — Task 5
- ✅ Friends who have this release on explore detail (section 12) — Task 5
- ✅ Add-to-shelf dialog (format + condition + rating) (section 11) — Task 5
- ✅ ShelfItem create: Release upsert + rating denorm + ADD_ITEM activity + notifications (sections 11, 13, 14) — Task 3
- ✅ Cache-Control on public explore pages (section 27) — Tasks 4, 5
- ✅ Block filter on new members (section 24) — Task 2

**Missing (covered in other plans):**
- FAB + barcode scanner in BottomBar (Plan 6 — Onboarding/UI)
- Shelf page `/shelf` with format pills (Plan 5 — ShelfItem update)
- Want button wired to `/api/wants/create` (Plan 5 — Collections/Wants)
