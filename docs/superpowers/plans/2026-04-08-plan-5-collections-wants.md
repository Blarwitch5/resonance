# Plan 5 — Collections & Wants

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Wants system (replacing the old Wishlist), Collections with slug routes and pin/unpin, and the Shelf page with format filtering.

**Architecture:** Wants are a simple join between User and Release. Collections use auto-generated slugs (from title), unique per user. Slug collisions get a numeric suffix. The Collection pin limit (max 4) is enforced applicatively before update. The Shelf page replaces the old `/vinyl`, `/cd`, `/cassette` pages with a single `/shelf?format=X`.

**Tech Stack:** Astro 6 SSR, Prisma, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-08-social-refactor-design.md` — sections 5, 8, 9, 25

**Depends on:** Plan 1 (Want, Collection models + repositories), Plan 3 (ShelfItem methods), Plan 4 (ShelfItem create)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/slug.ts` | Create | Slug generation from title + collision handling |
| `src/repositories/want-repository.ts` | Modify | Add full CRUD (Plan 1 creates the file) |
| `src/repositories/collection-repository.ts` | Modify | Add slug generation, pin/unpin |
| `src/pages/api/wants/create.ts` | Create | POST create Want |
| `src/pages/api/wants/[id]/delete.ts` | Create | DELETE remove Want |
| `src/pages/api/collections/[id]/pin.ts` | Create | POST toggle pin (max 4 check) |
| `src/pages/collections/new.astro` | Modify | Add slug generation on create |
| `src/pages/collections/index.astro` | Modify | List user collections with pin status |
| `src/pages/u/[username]/collections/[slug].astro` | Create | Public collection detail |
| `src/pages/shelf.astro` | Create | Shelf page with format filter pills |

---

## Task 1: Slug utility

**Files:**
- Create: `src/lib/slug.ts`

- [ ] **Step 1.1: Create slug generation utility**

```typescript
/**
 * Converts a title string to a URL-safe slug.
 * Example: "Ma Collection Jazz" → "ma-collection-jazz"
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .slice(0, 80)                    // max length
}

/**
 * Generates a unique slug for a collection within a user's scope.
 * If "ma-collection-jazz" already exists, tries "ma-collection-jazz-2", then "-3", etc.
 */
export async function uniqueSlug(
  title: string,
  userId: string,
  checkExists: (userId: string, slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(title)
  if (!base) throw new Error('Title produces empty slug')

  const exists = await checkExists(userId, base)
  if (!exists) return base

  for (let i = 2; i <= 100; i++) {
    const candidate = `${base}-${i}`
    const taken = await checkExists(userId, candidate)
    if (!taken) return candidate
  }

  // Fallback: append timestamp suffix
  return `${base}-${Date.now()}`
}
```

- [ ] **Step 1.2: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 1.3: Commit**

```bash
git add src/lib/slug.ts
git commit -m "feat(collections): add slug generation utility"
```

---

## Task 2: Want repository and API endpoints

**Files:**
- Modify: `src/repositories/want-repository.ts`
- Create: `src/pages/api/wants/create.ts`
- Create: `src/pages/api/wants/[id]/delete.ts`

- [ ] **Step 2.1: Update `want-repository.ts` with full CRUD**

Open `src/repositories/want-repository.ts` (created in Plan 1) and ensure it has:

```typescript
import { db } from '../lib/db'

export class WantRepository {
  async create(userId: string, releaseId: string, priority: 'high' | 'normal' = 'normal') {
    return db.want.upsert({
      where: { userId_releaseId: { userId, releaseId } },
      update: { priority },
      create: { userId, releaseId, priority },
    })
  }

  async delete(id: string, userId: string) {
    return db.want.deleteMany({ where: { id, userId } })
  }

  async deleteByRelease(userId: string, releaseId: string) {
    return db.want.deleteMany({ where: { userId, releaseId } })
  }

  async findByUser(userId: string) {
    return db.want.findMany({
      where: { userId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        release: {
          select: {
            id: true,
            title: true,
            artist: true,
            coverUrl: true,
            format: true,
            year: true,
          },
        },
      },
    })
  }

  async findByUserAndRelease(userId: string, releaseId: string) {
    return db.want.findUnique({
      where: { userId_releaseId: { userId, releaseId } },
    })
  }

  async countByUser(userId: string) {
    return db.want.count({ where: { userId } })
  }
}

export const wantRepository = new WantRepository()
```

- [ ] **Step 2.2: Create Want create endpoint**

Create `src/pages/api/wants/create.ts`:

```typescript
import type { APIRoute } from 'astro'
import { wantRepository } from '../../../repositories/want-repository'
import { activityRepository } from '../../../repositories/activity-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// POST /api/wants/create
// Body: { releaseId: string, priority?: "high" | "normal" }
export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let releaseId: string, priority: 'high' | 'normal'
  try {
    const body = await request.json()
    releaseId = body?.releaseId
    priority = body?.priority === 'high' ? 'high' : 'normal'
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!releaseId) {
    return new Response(JSON.stringify({ error: 'releaseId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const want = await wantRepository.create(currentUser.id, releaseId, priority)

    // Create ADD_WANT activity
    await activityRepository.createActivity({
      userId: currentUser.id,
      type: 'ADD_WANT',
      shelfItemId: undefined,
    })

    return new Response(JSON.stringify({ want }), {
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

- [ ] **Step 2.3: Create Want delete endpoint**

Create `src/pages/api/wants/[id]/delete.ts`:

```typescript
import type { APIRoute } from 'astro'
import { wantRepository } from '../../../../repositories/want-repository'
import { safeErrorMessage } from '../../../../lib/api-error'

// DELETE /api/wants/[id]/delete
export const DELETE: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await wantRepository.delete(id, currentUser.id)
    return new Response(JSON.stringify({ deleted: true }), {
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

- [ ] **Step 2.4: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 2.5: Commit**

```bash
git add src/repositories/want-repository.ts \
  src/pages/api/wants/create.ts \
  src/pages/api/wants/[id]/delete.ts
git commit -m "feat(wants): add want repository and create/delete endpoints"
```

---

## Task 3: Collection pin/unpin API + slug-aware collection creation

**Files:**
- Modify: `src/repositories/collection-repository.ts`
- Create: `src/pages/api/collections/[id]/pin.ts`
- Modify: `src/pages/collections/new.astro`

- [ ] **Step 3.1: Add slug + pin methods to `collection-repository.ts`**

Open `src/repositories/collection-repository.ts` and add:

```typescript
import { uniqueSlug } from '../lib/slug'
import { db } from '../lib/db'

// Add inside CollectionRepository class:

async slugExists(userId: string, slug: string): Promise<boolean> {
  const found = await db.collection.findUnique({
    where: { userId_slug: { userId, slug } },
  })
  return found !== null
}

async createWithSlug(data: {
  userId: string
  name: string
  description?: string
  isPublic?: boolean
}) {
  const slug = await uniqueSlug(data.name, data.userId, this.slugExists.bind(this))
  return db.collection.create({
    data: {
      userId: data.userId,
      name: data.name,
      slug,
      description: data.description,
      isPublic: data.isPublic ?? true,
    },
  })
}

async togglePin(collectionId: string, userId: string): Promise<{ isPinned: boolean }> {
  const collection = await db.collection.findFirst({
    where: { id: collectionId, userId },
  })
  if (!collection) throw new Error('Collection not found')

  if (collection.isPinned) {
    // Unpin
    await db.collection.update({
      where: { id: collectionId },
      data: { isPinned: false },
    })
    return { isPinned: false }
  }

  // Pin: check limit of 4
  const pinnedCount = await db.collection.count({
    where: { userId, isPinned: true },
  })
  if (pinnedCount >= 4) {
    throw new Error('MAX_PINNED')
  }

  await db.collection.update({
    where: { id: collectionId },
    data: { isPinned: true },
  })
  return { isPinned: true }
}

async findBySlug(userId: string, slug: string) {
  return db.collection.findUnique({
    where: { userId_slug: { userId, slug } },
    include: {
      items: {
        include: {
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
        },
        orderBy: { addedAt: 'desc' },
      },
    },
  })
}

async findByUser(userId: string) {
  return db.collection.findMany({
    where: { userId },
    orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    include: { _count: { select: { items: true } } },
  })
}
```

- [ ] **Step 3.2: Create pin/unpin API**

Create `src/pages/api/collections/[id]/pin.ts`:

```typescript
import type { APIRoute } from 'astro'
import { collectionRepository } from '../../../../repositories/collection-repository'
import { safeErrorMessage } from '../../../../lib/api-error'

// POST /api/collections/[id]/pin
export const POST: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'Collection ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await collectionRepository.togglePin(id, currentUser.id)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'MAX_PINNED') {
      return new Response(
        JSON.stringify({ error: 'Tu ne peux épingler que 4 collections maximum.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

- [ ] **Step 3.3: Update collection creation to use `createWithSlug`**

Open `src/pages/api/collections/create.ts`. Find the line that calls `db.collection.create` or `collectionRepository.create` and replace it with `collectionRepository.createWithSlug`. The updated handler should look like:

```typescript
import type { APIRoute } from 'astro'
import { collectionRepository } from '../../../repositories/collection-repository'
import { safeErrorMessage } from '../../../lib/api-error'

export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let name: string, description: string | undefined, isPublic: boolean
  try {
    const body = await request.json()
    name = (body?.name ?? '').trim()
    description = body?.description?.trim() || undefined
    isPublic = body?.isPublic !== false // default true
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!name) {
    return new Response(JSON.stringify({ error: 'name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (name.length > 100) {
    return new Response(JSON.stringify({ error: 'name must be 100 characters or less' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const sanitizedDesc = description ? description.replace(/<[^>]*>/g, '') : undefined
    const collection = await collectionRepository.createWithSlug({
      userId: currentUser.id,
      name,
      description: sanitizedDesc,
      isPublic,
    })

    return new Response(JSON.stringify({ collection }), {
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

- [ ] **Step 3.4: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

- [ ] **Step 3.5: Commit**

```bash
git add src/repositories/collection-repository.ts \
  src/pages/api/collections/[id]/pin.ts \
  src/pages/api/collections/create.ts
git commit -m "feat(collections): add slug generation, pin/unpin, and slug-aware create"
```

---

## Task 4: Collection detail page

**Files:**
- Create: `src/pages/u/[username]/collections/[slug].astro`

- [ ] **Step 4.1: Create collection detail page**

```astro
---
import Layout from '../../../../components/layouts/Layout.astro'
import { userRepository } from '../../../../repositories/user-repository'
import { collectionRepository } from '../../../../repositories/collection-repository'
import { followRepository } from '../../../../repositories/follow-repository'
import { auth } from '../../../../lib/auth'

const { username, slug } = Astro.params
if (!username || !slug) return Astro.redirect('/explore')

const session = await auth.api.getSession({ headers: Astro.request.headers })
const currentUserId = session?.user?.id ?? null

const profileUser = await userRepository.findByUsername(username)
if (!profileUser) return Astro.redirect('/explore')

const collection = await collectionRepository.findBySlug(profileUser.id, slug)
if (!collection) return Astro.redirect(`/u/${username}`)

// Privacy: private collection visible only to owner or followers
const isOwner = currentUserId === profileUser.id
if (!collection.isPublic && !isOwner) {
  const canView = currentUserId
    ? await followRepository.isFollowing(currentUserId, profileUser.id)
    : false
  if (!canView) return Astro.redirect(`/u/${username}`)
}
---

<Layout title={`${collection.name} — ${profileUser.name ?? username}`}>
  <div class="collection-detail max-w-2xl mx-auto px-4 py-6">

    <header class="mb-6">
      <div class="flex items-center gap-2 mb-1">
        <a href={`/u/${username}`} class="text-sm text-muted hover:underline">@{username}</a>
        <span class="text-muted" aria-hidden="true">/</span>
        <span class="text-sm text-muted">Collections</span>
      </div>
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold">{collection.name}</h1>
          {collection.description && (
            <p class="text-sm text-muted mt-1">{collection.description}</p>
          )}
          <p class="text-xs text-muted mt-1">
            {collection.items.length} disque{collection.items.length !== 1 ? 's' : ''}
            {!collection.isPublic && <span class="ml-2 text-accent">Privée</span>}
          </p>
        </div>
        {isOwner && (
          <div class="flex gap-2">
            <button
              class="pin-btn btn-ghost text-xs"
              data-collection-id={collection.id}
              data-pinned={collection.isPinned ? 'true' : 'false'}
              aria-pressed={collection.isPinned}
              aria-label={collection.isPinned ? 'Désépingler du profil' : 'Épingler sur le profil'}
            >
              {collection.isPinned ? '📌 Épinglée' : 'Épingler'}
            </button>
          </div>
        )}
      </div>
    </header>

    {collection.items.length === 0 && (
      <p class="text-center text-muted py-12">Aucun disque dans cette collection.</p>
    )}

    <div class="grid grid-cols-3 gap-3" role="list" aria-label="Disques dans la collection">
      {collection.items.map((item) => (
        <div role="listitem">
          <a
            href={`/items/${item.shelfItem.id}`}
            class="block rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity"
            aria-label={`${item.shelfItem.release.artist} — ${item.shelfItem.release.title}`}
          >
            {item.shelfItem.release.coverUrl
              ? <img
                  src={item.shelfItem.release.coverUrl}
                  alt={`${item.shelfItem.release.artist} — ${item.shelfItem.release.title}`}
                  width="160"
                  height="160"
                  class="w-full aspect-square object-cover"
                  loading="lazy"
                />
              : <div class="w-full aspect-square bg-surface-raised flex items-center justify-center text-xs text-muted p-2 text-center">
                  {item.shelfItem.release.title}
                </div>
            }
            <div class="p-2">
              <p class="text-xs font-medium truncate">{item.shelfItem.release.title}</p>
              <p class="text-xs text-muted truncate">{item.shelfItem.release.artist}</p>
            </div>
          </a>
          {isOwner && item.note && (
            <p class="text-xs text-muted mt-1 px-1 truncate">{item.note}</p>
          )}
        </div>
      ))}
    </div>
  </div>
</Layout>

<script>
  const pinBtn = document.querySelector('.pin-btn') as HTMLButtonElement | null
  pinBtn?.addEventListener('click', async () => {
    const id = pinBtn.dataset.collectionId
    pinBtn.disabled = true
    try {
      const res = await fetch(`/api/collections/${id}/pin`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        pinBtn.dataset.pinned = data.isPinned ? 'true' : 'false'
        pinBtn.setAttribute('aria-pressed', String(data.isPinned))
        pinBtn.textContent = data.isPinned ? '📌 Épinglée' : 'Épingler'
      } else {
        alert(data.error)
      }
    } catch {
      // no-op
    } finally {
      pinBtn.disabled = false
    }
  })
</script>
```

- [ ] **Step 4.2: Verify build**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | grep -v "node_modules" | head -20
```

- [ ] **Step 4.3: Commit**

```bash
git add "src/pages/u/[username]/collections/[slug].astro"
git commit -m "feat(collections): add collection detail page with pin toggle"
```

---

## Task 5: Collections index page update

**Files:**
- Modify: `src/pages/collections/index.astro`

- [ ] **Step 5.1: Update collections list to show pin status and use slug routes**

Read `src/pages/collections/index.astro`, then replace with:

```astro
---
import Layout from '../../components/layouts/Layout.astro'
import { collectionRepository } from '../../repositories/collection-repository'
import { auth } from '../../lib/auth'

const session = await auth.api.getSession({ headers: Astro.request.headers })
if (!session) return Astro.redirect('/login')

const collections = await collectionRepository.findByUser(session.user.id)
const username = session.user.username ?? session.user.id
---

<Layout title="Mes collections">
  <div class="collections-page max-w-2xl mx-auto px-4 py-6">
    <header class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold">Mes collections</h1>
      <a href="/collections/new" class="btn-primary text-sm">Nouvelle</a>
    </header>

    {collections.length === 0 && (
      <div class="text-center py-12">
        <p class="text-muted mb-4">Aucune collection pour l'instant.</p>
        <a href="/collections/new" class="btn-secondary">Créer ma première collection</a>
      </div>
    )}

    <ul class="space-y-2" role="list">
      {collections.map((col) => (
        <li>
          <a
            href={`/u/${username}/collections/${col.slug}`}
            class="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-surface-raised transition-colors"
          >
            <div class="flex items-center gap-2 min-w-0">
              {col.isPinned && <span aria-label="Épinglée" title="Épinglée sur le profil">📌</span>}
              <span class="font-medium truncate">{col.name}</span>
              {!col.isPublic && <span class="text-xs text-muted">(Privée)</span>}
            </div>
            <span class="text-sm text-muted flex-shrink-0 ml-2">
              {col._count.items} disque{col._count.items !== 1 ? 's' : ''}
            </span>
          </a>
        </li>
      ))}
    </ul>
  </div>
</Layout>
```

- [ ] **Step 5.2: Verify build**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | grep -v "node_modules" | head -20
```

- [ ] **Step 5.3: Commit**

```bash
git add src/pages/collections/index.astro
git commit -m "feat(collections): update collections list with slug routes and pin status"
```

---

## Task 6: Shelf page with format filtering

**Files:**
- Create: `src/pages/shelf.astro`

- [ ] **Step 6.1: Create the shelf page**

```astro
---
import Layout from '../components/layouts/Layout.astro'
import { shelfItemRepository } from '../repositories/shelf-item-repository'
import { auth } from '../lib/auth'

const session = await auth.api.getSession({ headers: Astro.request.headers })
if (!session) return Astro.redirect('/login')

const userId = session.user.id

// Format filter from query string
const formatParam = Astro.url.searchParams.get('format')
const validFormats = ['Vinyl', 'CD', 'Cassette']
const activeFormat = validFormats.includes(formatParam ?? '') ? formatParam : null

// Sort filter
const sort = Astro.url.searchParams.get('sort') ?? 'recent'

const shelfItems = await shelfItemRepository.findByUser(userId, {
  format: activeFormat ?? undefined,
  sort: sort === 'artist' ? 'artist' : 'recent',
})
---

<Layout title="Ma shelf">
  <div class="shelf-page max-w-2xl mx-auto px-4 py-4">

    <header class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-semibold">Ma shelf</h1>
      <span class="text-sm text-muted">{shelfItems.length} disque{shelfItems.length !== 1 ? 's' : ''}</span>
    </header>

    <!-- Format pills -->
    <nav class="format-pills flex gap-2 mb-4 overflow-x-auto pb-1" aria-label="Filtrer par format">
      {[null, 'Vinyl', 'CD', 'Cassette'].map((fmt) => (
        <a
          href={fmt ? `/shelf?format=${fmt}` : '/shelf'}
          class={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm border transition-colors ${
            activeFormat === fmt
              ? 'bg-accent text-on-accent border-accent'
              : 'border-border hover:bg-surface-raised'
          }`}
          aria-current={activeFormat === fmt ? 'page' : undefined}
        >
          {fmt ?? 'Tout'}
        </a>
      ))}
    </nav>

    {shelfItems.length === 0 && (
      <div class="text-center py-16">
        <p class="text-muted mb-4">
          {activeFormat
            ? `Aucun ${activeFormat} dans ta shelf.`
            : 'Ta shelf est vide. Ajoute ton premier disque !'}
        </p>
        {!activeFormat && (
          <button
            class="btn-primary open-add-modal"
            aria-label="Ajouter un disque"
          >
            + Ajouter un disque
          </button>
        )}
      </div>
    )}

    <div class="shelf-grid grid grid-cols-3 gap-3" role="list" aria-label="Ta collection">
      {shelfItems.map((item) => (
        <div role="listitem">
          <a
            href={`/items/${item.id}`}
            class="block rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity"
            aria-label={`${item.release.artist} — ${item.release.title}`}
          >
            {item.release.coverUrl
              ? <img
                  src={item.release.coverUrl}
                  alt={`${item.release.artist} — ${item.release.title}`}
                  width="160"
                  height="160"
                  class="w-full aspect-square object-cover"
                  loading="lazy"
                />
              : <div class="w-full aspect-square bg-surface-raised flex items-center justify-center text-xs text-muted p-2 text-center">
                  {item.release.title}
                </div>
            }
          </a>
        </div>
      ))}
    </div>
  </div>
</Layout>
```

- [ ] **Step 6.2: Add `findByUser` with format and sort to `shelf-item-repository.ts`**

```typescript
async findByUser(
  userId: string,
  options: { format?: string; sort?: 'recent' | 'artist' } = {},
) {
  const { format, sort = 'recent' } = options
  return db.shelfItem.findMany({
    where: {
      userId,
      ...(format && { release: { format } }),
    },
    orderBy:
      sort === 'artist'
        ? [{ release: { artist: 'asc' } }, { release: { title: 'asc' } }]
        : [{ createdAt: 'desc' }],
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
  })
}
```

- [ ] **Step 6.3: Verify build**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | grep -v "node_modules" | head -20
```

- [ ] **Step 6.4: Run smoke tests**

```bash
pnpm e2e:smoke
```

Expected: all smoke tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/pages/shelf.astro src/repositories/shelf-item-repository.ts
git commit -m "feat(shelf): add shelf page with format filter pills and sort"
```

---

## Self-Review

**Spec coverage:**
- ✅ Wants CRUD (section 8) — Tasks 2
- ✅ ADD_WANT activity on want create (section 13) — Task 2
- ✅ Collections with auto-generated slug, unique per user (section 9) — Tasks 1, 3
- ✅ Collections: isPublic + isPinned (max 4) (section 9) — Task 3
- ✅ Pin/unpin API with MAX_PINNED enforcement (section 9) — Task 3
- ✅ `/u/[username]/collections/[slug]` route (section 25) — Task 4
- ✅ Collection detail: privacy enforcement (section 18) — Task 4
- ✅ Collections index with pin status (section 9) — Task 5
- ✅ Shelf page `/shelf?format=X` (sections 5, 26) — Task 6
- ✅ Format pills filter (section 5) — Task 6

**Missing (covered in other plans):**
- Want button on item detail and explore detail wires to `/api/wants/create` (Plan 4 already uses it)
- Collection `CREATE_COLLECTION` activity on create (to add in collection create endpoint)
- Rating update from item detail edit (Plan 6 — Settings/item edit)
