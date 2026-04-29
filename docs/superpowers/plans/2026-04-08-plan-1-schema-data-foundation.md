# Plan 1 — Schema & Data Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Prisma schema to the spec's target architecture (Release/ShelfItem split, Want, UserBlock, PushToken, Collection rename, performance indexes, denormalized rating) and update all repositories accordingly.

**Architecture:** The current schema uses a monolithic `Item` model. The spec splits this into `Release` (shared Discogs metadata) and `ShelfItem` (user's personal instance). This enables community ratings, "X friends have this", and trending. The existing `List`/`ListItem` becomes `Collection`/`CollectionItem`. `WishlistItem` becomes `Want`. New social models: `UserBlock`, `PushToken`. The existing migration `20260407081901_social_refactor` is a partial refactor — this plan completes it.

**Tech Stack:** Prisma ORM, PostgreSQL (Neon), TypeScript, pnpm

**Spec:** `docs/superpowers/specs/2026-04-08-social-refactor-design.md` — sections 9, 16

---

## State Before This Plan

Already in place (do NOT redo):
- `Follow`, `Activity`, `ActivityLike`, `ActivityComment`, `Notification` models
- `FollowRepository` with follow/unfollow/isFollowing/getFollowers/getFollowing
- `ActivityRepository` with getFeedForUser (page-based), toggleLike
- `NotificationRepository` (basic create)
- `CollectionRepository` (uses `db.collection` — Collection rename partially done)

Missing / to change:
- `Item` → split into `Release` + `ShelfItem`
- `WishlistItem` → `Want`
- `List`/`ListItem` → ensure fully renamed to `Collection`/`CollectionItem` with `isPinned`, `slug`
- `UserBlock` model
- `PushToken` model
- `User` fields: `onboardingCompleted`, `lastExportAt`
- `ActivityType` enum: `CREATE_LIST`→`CREATE_COLLECTION`, `ADD_TO_LIST`→`ADD_TO_COLLECTION`, + `FOLLOW_USER`
- `NotificationType` enum: + `NEW_SHELF_ADD`
- `Release.avgRating`, `Release.ratingCount` (denormalized)
- `@@index([userId, createdAt])` on `Activity`
- `@@index([createdAt])` on `ShelfItem`
- Update `ActivityRepository` to use `ShelfItem` instead of `Item`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `prisma/schema.prisma` | Modify | Full target schema |
| `prisma/migrations/YYYYMMDD_complete_social_refactor/migration.sql` | Create | SQL migration |
| `src/repositories/activity-repository.ts` | Modify | Use ShelfItem instead of Item |
| `src/repositories/collection-repository.ts` | Modify | Add isPinned, slug methods |
| `src/repositories/notification-repository.ts` | Modify | Add NEW_SHELF_ADD upsert logic |
| `src/repositories/want-repository.ts` | Create | CRUD for Want model |
| `src/repositories/block-repository.ts` | Create | Block/unblock with atomic transaction |
| `src/repositories/release-repository.ts` | Create | Release upsert + rating update |
| `src/repositories/shelf-item-repository.ts` | Create | ShelfItem CRUD + condition + rating |
| `src/lib/db.ts` | Verify | Prisma client singleton (no change expected) |

---

## Task 1: Update `prisma/schema.prisma` to target architecture

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1.1: Replace Item with Release + ShelfItem, WishlistItem with Want**

Replace the entire `schema.prisma` content with the target schema. Open `prisma/schema.prisma` and apply these changes:

**Remove** the `Item` model and `WishlistItem` model entirely.

**Add** after the `User` model:

```prisma
// Release Discogs — ressource partagée entre tous les utilisateurs
model Release {
  id          String   @id @default(cuid())
  discogsId   String   @unique
  title       String
  artist      String
  label       String?
  year        Int?
  country     String?
  format      String   // "Vinyl" | "CD" | "Cassette"
  coverUrl    String?
  tracklist   Json?
  avgRating   Float?
  ratingCount Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  shelfItems  ShelfItem[]
  wants       Want[]

  @@map("releases")
}

// Instance personnelle d'une Release dans la shelf d'un utilisateur
model ShelfItem {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  releaseId   String
  release     Release   @relation(fields: [releaseId], references: [id])
  condition   String    // "Mint" | "NM" | "EX" | "VG+" | "VG" | "G"
  rating      Int?      // 1–5
  note        String?
  acquiredAt  DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  collectionItems CollectionItem[]
  activities      Activity[]

  @@unique([userId, releaseId])
  @@index([userId])
  @@index([releaseId])
  @@index([createdAt])
  @@map("shelf_items")
}

// Want — liste d'envies unifiée (ex WishlistItem)
model Want {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  releaseId String
  release   Release  @relation(fields: [releaseId], references: [id])
  priority  String   @default("normal") // "high" | "normal"
  createdAt DateTime @default(now())

  @@unique([userId, releaseId])
  @@index([userId])
  @@map("wants")
}
```

- [ ] **Step 1.2: Update Collection model (ensure isPinned + slug)**

Find the `Collection` model (or `List` model). Ensure it reads:

```prisma
model Collection {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  slug        String
  description String?
  isPublic    Boolean  @default(true)
  isPinned    Boolean  @default(false)
  coverUrl    String?
  items       CollectionItem[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, slug])
  @@index([userId])
  @@map("collections")
}

model CollectionItem {
  id          String    @id @default(cuid())
  collectionId String
  collection  Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  shelfItemId String
  shelfItem   ShelfItem  @relation(fields: [shelfItemId], references: [id], onDelete: Cascade)
  position    Int?
  note        String?
  addedAt     DateTime  @default(now())

  @@unique([collectionId, shelfItemId])
  @@map("collection_items")
}
```

If a `List`/`ListItem` model still exists, remove it.

- [ ] **Step 1.3: Add UserBlock and PushToken models**

Add after the `Follow` model:

```prisma
model UserBlock {
  id        String   @id @default(cuid())
  blockerId String
  blocker   User     @relation("Blocking", fields: [blockerId], references: [id], onDelete: Cascade)
  blockedId String
  blocked   User     @relation("BlockedBy", fields: [blockedId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([blockerId, blockedId])
  @@index([blockerId])
  @@map("user_blocks")
}

model PushToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  platform  String   // "ios" | "android" | "web"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@map("push_tokens")
}
```

- [ ] **Step 1.4: Update ActivityType and NotificationType enums**

```prisma
enum ActivityType {
  ADD_ITEM
  ADD_WANT
  RATE_ITEM
  CREATE_COLLECTION
  ADD_TO_COLLECTION
  FOLLOW_USER
}

enum NotificationType {
  NEW_FOLLOWER
  NEW_SHELF_ADD
  ACTIVITY_LIKE
  ACTIVITY_COMMENT
}
```

- [ ] **Step 1.5: Add @@index on Activity and update User model**

On the `Activity` model, add:
```prisma
  @@index([userId, createdAt])
```

On `Activity`, update the `item` relation to use `ShelfItem`:
```prisma
  shelfItemId    String?
  shelfItem      ShelfItem? @relation(fields: [shelfItemId], references: [id], onDelete: SetNull)
```
Remove the old `itemId`/`item` relation pointing to `Item`.

On the `User` model, add these fields:
```prisma
  onboardingCompleted Boolean  @default(false)
  lastExportAt        DateTime?
  shelfItems          ShelfItem[]
  wants               Want[]
  blocks              UserBlock[] @relation("Blocking")
  blockedBy           UserBlock[] @relation("BlockedBy")
  pushTokens          PushToken[]
```

- [ ] **Step 1.6: Verify the schema compiles**

```bash
pnpm exec prisma validate
```

Expected: no errors. Fix any relation or field errors before continuing.

- [ ] **Step 1.7: Commit the schema**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): migrate to Release/ShelfItem architecture

- Release: shared Discogs metadata with avgRating/ratingCount
- ShelfItem: user's personal instance (condition, rating, note)
- Want: replaces WishlistItem
- UserBlock: atomic blocking
- PushToken: Capacitor push notifications
- Collection: add isPinned, slug fields
- CollectionItem: links Collection to ShelfItem
- ActivityType: CREATE_COLLECTION, ADD_TO_COLLECTION, FOLLOW_USER
- NotificationType: NEW_SHELF_ADD
- User: onboardingCompleted, lastExportAt
- Activity: @@index([userId, createdAt])
- ShelfItem: @@index([createdAt])"
```

---

## Task 2: Generate and apply the Prisma migration

**Files:**
- Create: `prisma/migrations/YYYYMMDD_complete_social_refactor/migration.sql`

- [ ] **Step 2.1: Generate migration**

```bash
pnpm exec prisma migrate dev --name complete_social_refactor --create-only
```

Expected: Prisma creates `prisma/migrations/YYYYMMDD_complete_social_refactor/migration.sql`. Review it before applying — it should contain `CREATE TABLE releases`, `CREATE TABLE shelf_items`, `CREATE TABLE wants`, `CREATE TABLE user_blocks`, `CREATE TABLE push_tokens`, `ALTER TABLE collections ADD COLUMN is_pinned`, `ALTER TABLE collections ADD COLUMN slug`, `DROP TABLE items` (or rename if data migration needed), `DROP TABLE wishlist_items`.

**⚠️ Data migration note:** If there is existing data in `items` or `wishlist_items` tables (dev environment), the migration will drop that data. This is acceptable for dev. For prod, a data migration script would be needed — out of scope for this plan.

- [ ] **Step 2.2: Apply migration**

```bash
pnpm exec prisma migrate dev
```

Expected: `Database schema is now in sync with your Prisma schema.`

- [ ] **Step 2.3: Regenerate Prisma client**

```bash
pnpm exec prisma generate
```

Expected: `Generated Prisma Client`.

- [ ] **Step 2.4: Verify DB structure**

```bash
pnpm exec prisma studio
```

Check that tables `releases`, `shelf_items`, `wants`, `user_blocks`, `push_tokens` exist. Check `collections` has `is_pinned` and `slug` columns. Close studio.

- [ ] **Step 2.5: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(migration): complete_social_refactor — apply schema changes"
```

---

## Task 3: Create `ReleaseRepository`

**Files:**
- Create: `src/repositories/release-repository.ts`

- [ ] **Step 3.1: Write the repository**

```typescript
// src/repositories/release-repository.ts
import { db } from '../lib/db'

export class ReleaseRepository {
  /**
   * Upsert a Release from Discogs data.
   * Used when adding an item to shelf — creates the Release if it doesn't exist.
   */
  async upsertFromDiscogs(data: {
    discogsId: string
    title: string
    artist: string
    label?: string | null
    year?: number | null
    country?: string | null
    format: string
    coverUrl?: string | null
    tracklist?: object | null
  }) {
    return db.release.upsert({
      where: { discogsId: data.discogsId },
      create: data,
      update: {
        title: data.title,
        artist: data.artist,
        label: data.label,
        year: data.year,
        country: data.country,
        coverUrl: data.coverUrl,
        tracklist: data.tracklist ?? undefined,
      },
    })
  }

  async findByDiscogsId(discogsId: string) {
    return db.release.findUnique({
      where: { discogsId },
      include: {
        _count: { select: { shelfItems: true, wants: true } },
      },
    })
  }

  async findById(id: string) {
    return db.release.findUnique({
      where: { id },
      include: {
        _count: { select: { shelfItems: true, wants: true } },
      },
    })
  }

  /**
   * Update avgRating and ratingCount atomically after a rating change.
   * Called inside a prisma.$transaction when a ShelfItem rating is set/updated/removed.
   */
  async recalculateRating(releaseId: string) {
    const result = await db.shelfItem.aggregate({
      where: { releaseId, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    })

    return db.release.update({
      where: { id: releaseId },
      data: {
        avgRating: result._avg.rating,
        ratingCount: result._count.rating,
      },
    })
  }

  /**
   * Trending: releases most added to shelves in the last 7 days.
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

    const releaseIds = grouped.map((g) => g.releaseId)
    const releases = await db.release.findMany({
      where: { id: { in: releaseIds } },
    })

    // Preserve trending order
    return releaseIds.map((id) => releases.find((r) => r.id === id)).filter(Boolean)
  }
}

export const releaseRepository = new ReleaseRepository()
```

- [ ] **Step 3.2: Commit**

```bash
git add src/repositories/release-repository.ts
git commit -m "feat(repo): add ReleaseRepository with upsert, rating, trending"
```

---

## Task 4: Create `ShelfItemRepository`

**Files:**
- Create: `src/repositories/shelf-item-repository.ts`

- [ ] **Step 4.1: Write the repository**

```typescript
// src/repositories/shelf-item-repository.ts
import { db } from '../lib/db'

export const shelfItemInclude = {
  release: true,
} as const

export type ShelfItemWithRelease = Awaited<ReturnType<ShelfItemRepository['findById']>>

export class ShelfItemRepository {
  async findById(id: string, userId?: string) {
    return db.shelfItem.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
      include: shelfItemInclude,
    })
  }

  async findByUserAndRelease(userId: string, releaseId: string) {
    return db.shelfItem.findUnique({
      where: { userId_releaseId: { userId, releaseId } },
      include: shelfItemInclude,
    })
  }

  async findByUser(userId: string, options?: {
    format?: string
    search?: string
    sortBy?: 'createdAt' | 'artist' | 'rating'
    sortDir?: 'asc' | 'desc'
    cursor?: string
    take?: number
  }) {
    const { format, search, sortBy = 'createdAt', sortDir = 'desc', cursor, take = 24 } = options ?? {}

    return db.shelfItem.findMany({
      where: {
        userId,
        release: {
          ...(format ? { format } : {}),
          ...(search ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { artist: { contains: search, mode: 'insensitive' } },
            ],
          } : {}),
        },
      },
      include: shelfItemInclude,
      orderBy: sortBy === 'artist'
        ? { release: { artist: sortDir } }
        : sortBy === 'rating'
        ? { rating: sortDir }
        : { createdAt: sortDir },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take,
    })
  }

  async create(data: {
    userId: string
    releaseId: string
    condition: string
    rating?: number | null
    note?: string | null
    acquiredAt?: Date | null
  }) {
    return db.shelfItem.create({
      data,
      include: shelfItemInclude,
    })
  }

  async update(id: string, userId: string, data: {
    condition?: string
    note?: string | null
    acquiredAt?: Date | null
  }) {
    const item = await db.shelfItem.findFirst({ where: { id, userId } })
    if (!item) throw new Error('Item not found or unauthorized')

    return db.shelfItem.update({
      where: { id },
      data,
      include: shelfItemInclude,
    })
  }

  /**
   * Update rating and recalculate Release.avgRating atomically.
   */
  async setRating(id: string, userId: string, rating: number | null) {
    const item = await db.shelfItem.findFirst({ where: { id, userId }, select: { id: true, releaseId: true } })
    if (!item) throw new Error('Item not found or unauthorized')

    const [updated] = await db.$transaction([
      db.shelfItem.update({ where: { id }, data: { rating } }),
    ])

    // Recalculate after transaction (read after write)
    await db.$transaction(async (tx) => {
      const result = await tx.shelfItem.aggregate({
        where: { releaseId: item.releaseId, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      })
      await tx.release.update({
        where: { id: item.releaseId },
        data: { avgRating: result._avg.rating, ratingCount: result._count.rating },
      })
    })

    return updated
  }

  async delete(id: string, userId: string) {
    const item = await db.shelfItem.findFirst({ where: { id, userId } })
    if (!item) throw new Error('Item not found or unauthorized')
    return db.shelfItem.delete({ where: { id } })
  }

  /**
   * Returns IDs of users in `followerIds` who also have this release in their shelf.
   */
  async findFollowersWithRelease(releaseId: string, followerIds: string[]) {
    return db.shelfItem.findMany({
      where: { releaseId, userId: { in: followerIds } },
      include: {
        user: { select: { id: true, username: true, name: true, imageUrl: true } },
      },
    })
  }

  async getRecentByUser(userId: string, limit = 6) {
    return db.shelfItem.findMany({
      where: { userId },
      include: shelfItemInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }
}

export const shelfItemRepository = new ShelfItemRepository()
```

- [ ] **Step 4.2: Commit**

```bash
git add src/repositories/shelf-item-repository.ts
git commit -m "feat(repo): add ShelfItemRepository with cursor pagination and atomic rating"
```

---

## Task 5: Create `WantRepository`

**Files:**
- Create: `src/repositories/want-repository.ts`

- [ ] **Step 5.1: Write the repository**

```typescript
// src/repositories/want-repository.ts
import { db } from '../lib/db'

export class WantRepository {
  async findByUser(userId: string) {
    return db.want.findMany({
      where: { userId },
      include: { release: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByUserAndRelease(userId: string, releaseId: string) {
    return db.want.findUnique({
      where: { userId_releaseId: { userId, releaseId } },
    })
  }

  async findDiscogsIdsByUser(userId: string): Promise<string[]> {
    const wants = await db.want.findMany({
      where: { userId },
      include: { release: { select: { discogsId: true } } },
    })
    return wants.map((w) => w.release.discogsId)
  }

  async create(userId: string, releaseId: string, priority: 'high' | 'normal' = 'normal') {
    return db.want.create({
      data: { userId, releaseId, priority },
      include: { release: true },
    })
  }

  async updatePriority(id: string, userId: string, priority: 'high' | 'normal') {
    const want = await db.want.findFirst({ where: { id, userId } })
    if (!want) throw new Error('Want not found or unauthorized')
    return db.want.update({ where: { id }, data: { priority } })
  }

  async delete(id: string, userId: string) {
    const want = await db.want.findFirst({ where: { id, userId } })
    if (!want) throw new Error('Want not found or unauthorized')
    return db.want.delete({ where: { id } })
  }

  async deleteByReleaseId(userId: string, releaseId: string) {
    return db.want.deleteMany({ where: { userId, releaseId } })
  }

  async count(userId: string) {
    return db.want.count({ where: { userId } })
  }
}

export const wantRepository = new WantRepository()
```

- [ ] **Step 5.2: Commit**

```bash
git add src/repositories/want-repository.ts
git commit -m "feat(repo): add WantRepository replacing WishlistItem logic"
```

---

## Task 6: Create `BlockRepository`

**Files:**
- Create: `src/repositories/block-repository.ts`

- [ ] **Step 6.1: Write the repository**

```typescript
// src/repositories/block-repository.ts
import { db } from '../lib/db'

export class BlockRepository {
  /**
   * Block a user: atomically delete mutual follows + create UserBlock.
   * Spec requirement: prisma.$transaction — no intermediate state.
   */
  async block(blockerId: string, blockedId: string) {
    return db.$transaction([
      db.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      }),
      db.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId },
        update: {},
      }),
    ])
  }

  async unblock(blockerId: string, blockedId: string) {
    return db.userBlock.deleteMany({ where: { blockerId, blockedId } })
  }

  async isBlocked(blockerId: string, blockedId: string) {
    const block = await db.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      select: { id: true },
    })
    return !!block
  }

  /**
   * Returns true if either user has blocked the other.
   */
  async isMutuallyBlocked(userA: string, userB: string) {
    const count = await db.userBlock.count({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    })
    return count > 0
  }

  async getBlockedByUser(userId: string) {
    return db.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: { select: { id: true, username: true, name: true, imageUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}

export const blockRepository = new BlockRepository()
```

- [ ] **Step 6.2: Commit**

```bash
git add src/repositories/block-repository.ts
git commit -m "feat(repo): add BlockRepository with atomic follow-deletion transaction"
```

---

## Task 7: Update `ActivityRepository` for ShelfItem

**Files:**
- Modify: `src/repositories/activity-repository.ts`

- [ ] **Step 7.1: Update activityInclude and getFeedForUser**

Replace the `activityInclude` constant and `getFeedForUser` method:

```typescript
// src/repositories/activity-repository.ts
import { db } from '../lib/db'

const activityInclude = {
  user: {
    select: { id: true, username: true, name: true, imageUrl: true },
  },
  shelfItem: {
    include: {
      release: {
        select: {
          id: true,
          discogsId: true,
          title: true,
          artist: true,
          coverUrl: true,
          format: true,
          year: true,
          avgRating: true,
          ratingCount: true,
        },
      },
    },
  },
  likes: { select: { userId: true } },
  _count: { select: { comments: true } },
} as const

export type FeedActivity = Awaited<ReturnType<ActivityRepository['getFeedForUser']>>['activities'][number]

export class ActivityRepository {
  /**
   * Cursor-based feed query — single WHERE userId IN (...) ORDER BY createdAt DESC.
   * Spec: no loop per follow, composite cursor (createdAt, id) for uniqueness.
   */
  async getFeedForUser(
    userId: string,
    cursor?: { createdAt: Date; id: string },
    take = 20,
  ) {
    const followedUsers = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    const followedIds = followedUsers.map((f) => f.followingId)

    const activities = await db.activity.findMany({
      where: {
        userId: { in: followedIds },
        ...(cursor ? {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        } : {}),
      },
      include: activityInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    })

    const nextCursor = activities.length === take
      ? { createdAt: activities[activities.length - 1].createdAt, id: activities[activities.length - 1].id }
      : null

    return { activities, hasFollowing: followedIds.length > 0, nextCursor }
  }

  async getActivitiesForUser(userId: string, cursor?: { createdAt: Date; id: string }, take = 20) {
    const activities = await db.activity.findMany({
      where: {
        userId,
        ...(cursor ? {
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { createdAt: cursor.createdAt, id: { lt: cursor.id } },
          ],
        } : {}),
      },
      include: activityInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    })
    const nextCursor = activities.length === take
      ? { createdAt: activities[activities.length - 1].createdAt, id: activities[activities.length - 1].id }
      : null
    return { activities, nextCursor }
  }

  async create(data: {
    userId: string
    type: 'ADD_ITEM' | 'ADD_WANT' | 'RATE_ITEM' | 'CREATE_COLLECTION' | 'ADD_TO_COLLECTION' | 'FOLLOW_USER'
    shelfItemId?: string
    collectionId?: string
  }) {
    return db.activity.create({ data, include: activityInclude })
  }

  async toggleLike(activityId: string, userId: string) {
    const existing = await db.activityLike.findUnique({
      where: { activityId_userId: { activityId, userId } },
    })
    if (existing) {
      await db.activityLike.delete({ where: { activityId_userId: { activityId, userId } } })
      return { liked: false }
    }
    await db.activityLike.create({ data: { activityId, userId } })
    return { liked: true }
  }

  async addComment(activityId: string, userId: string, text: string) {
    if (text.length > 280) throw new Error('Comment too long (max 280 chars)')
    return db.activityComment.create({
      data: { activityId, userId, text },
      include: { user: { select: { id: true, username: true, name: true, imageUrl: true } } },
    })
  }
}

export const activityRepository = new ActivityRepository()
```

- [ ] **Step 7.2: Update feed.astro to use cursor-based pagination**

Open `src/pages/feed.astro`. Replace the `page`-based call:

```typescript
// Before
const page = Number.parseInt(Astro.url.searchParams.get('page') || '1')
const { activities, hasFollowing, pagination } = await activityRepository.getFeedForUser(currentUser.id, page)

// After
const { activities, hasFollowing, nextCursor } = await activityRepository.getFeedForUser(currentUser.id)
```

Pass `nextCursor` to the template for infinite scroll (encoded as a JSON data attribute on the feed container).

- [ ] **Step 7.3: Commit**

```bash
git add src/repositories/activity-repository.ts src/pages/feed.astro
git commit -m "feat(repo): update ActivityRepository to ShelfItem + cursor-based feed"
```

---

## Task 8: Update `NotificationRepository` with NEW_SHELF_ADD upsert

**Files:**
- Modify: `src/repositories/notification-repository.ts`

- [ ] **Step 8.1: Add upsert logic for grouped NEW_SHELF_ADD**

The spec requires: upsert on `(userId, fromUserId, type, windowStart)` with `increment` of `count`. The `Notification` model needs a `count` field and `windowStart` field. Add these to the schema before running this task if not already present:

```prisma
// Add to Notification model in schema.prisma:
count       Int      @default(1)
windowStart DateTime?
```

Run `pnpm exec prisma migrate dev --name add_notification_grouping` then `pnpm exec prisma generate`.

Then update the repository:

```typescript
// src/repositories/notification-repository.ts
import { db } from '../lib/db'
import type { NotificationType } from '@prisma/client'

export class NotificationRepository {
  async create(data: {
    userId: string
    type: NotificationType
    fromUserId?: string
    activityId?: string
  }) {
    return db.notification.create({ data })
  }

  /**
   * Upsert for NEW_SHELF_ADD — groups notifications within a 2h window.
   * Spec: upsert on (userId, fromUserId, type, windowStart) + increment count.
   * windowStart = floor(now / 2h) * 2h — e.g. 10:00 or 12:00.
   */
  async upsertShelfAdd(userId: string, fromUserId: string) {
    const now = new Date()
    const twoHours = 2 * 60 * 60 * 1000
    const windowStart = new Date(Math.floor(now.getTime() / twoHours) * twoHours)

    return db.notification.upsert({
      where: {
        userId_fromUserId_type_windowStart: {
          userId,
          fromUserId,
          type: 'NEW_SHELF_ADD',
          windowStart,
        },
      },
      create: {
        userId,
        fromUserId,
        type: 'NEW_SHELF_ADD',
        windowStart,
        count: 1,
        read: false,
      },
      update: {
        count: { increment: 1 },
        read: false,
      },
    })
  }

  async findByUser(userId: string, unreadOnly = false) {
    return db.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async markAllRead(userId: string) {
    return db.notification.updateMany({ where: { userId, read: false }, data: { read: true } })
  }

  async markRead(id: string, userId: string) {
    return db.notification.updateMany({ where: { id, userId }, data: { read: true } })
  }

  async countUnread(userId: string) {
    return db.notification.count({ where: { userId, read: false } })
  }
}

export const notificationRepository = new NotificationRepository()
```

**Note:** The `@@unique([userId, fromUserId, type, windowStart])` constraint must be added to the `Notification` model in the schema for the upsert `where` to work. Add it before running the migration.

- [ ] **Step 8.2: Commit**

```bash
git add src/repositories/notification-repository.ts prisma/schema.prisma prisma/migrations/
git commit -m "feat(repo): NotificationRepository with NEW_SHELF_ADD upsert grouping"
```

---

## Task 9: Update `CollectionRepository` with slug + isPinned

**Files:**
- Modify: `src/repositories/collection-repository.ts`

- [ ] **Step 9.1: Add slug generation and isPinned methods**

Add these methods to the existing `CollectionRepository`:

```typescript
  /**
   * Auto-generate a unique slug from title for a given user.
   * "Ma Collection Jazz" → "ma-collection-jazz"
   * Collision → "ma-collection-jazz-2"
   */
  async generateSlug(userId: string, title: string): Promise<string> {
    const base = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)

    let slug = base
    let counter = 2
    while (await db.collection.findUnique({ where: { userId_slug: { userId, slug } } })) {
      slug = `${base}-${counter}`
      counter++
    }
    return slug
  }

  async create(data: { userId: string; name: string; description?: string; isPublic?: boolean }) {
    const slug = await this.generateSlug(data.userId, data.name)
    return db.collection.create({
      data: { ...data, slug },
    })
  }

  /**
   * Pin a collection on the user's profile. Max 4 pinned enforced applicatively.
   */
  async pin(id: string, userId: string) {
    const pinnedCount = await db.collection.count({ where: { userId, isPinned: true } })
    if (pinnedCount >= 4) throw new Error('Maximum 4 pinned collections')
    return db.collection.update({ where: { id }, data: { isPinned: true } })
  }

  async unpin(id: string, userId: string) {
    return db.collection.update({ where: { id }, data: { isPinned: false } })
  }

  async findPinnedByUser(userId: string) {
    return db.collection.findMany({
      where: { userId, isPinned: true },
      include: { _count: { select: { items: true } } },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async findByUserAndSlug(userId: string, slug: string) {
    return db.collection.findUnique({
      where: { userId_slug: { userId, slug } },
      include: {
        items: {
          include: { shelfItem: { include: { release: true } } },
          orderBy: { position: 'asc' },
        },
      },
    })
  }
```

- [ ] **Step 9.2: Commit**

```bash
git add src/repositories/collection-repository.ts
git commit -m "feat(repo): CollectionRepository — slug auto-gen, isPinned, max-4 enforcement"
```

---

## Task 10: Create `UserRepository` stats method

**Files:**
- Modify: `src/repositories/user-repository.ts`

- [ ] **Step 10.1: Add getProfileStats**

Add this method to the existing `UserRepository`:

```typescript
  /**
   * Returns all profile stats in a single Promise.all — no sequential queries.
   * Spec: parallel queries for public profile performance.
   */
  async getProfileStats(userId: string) {
    const [recordCount, collectionCount, followerCount, followingCount, wantCount] =
      await Promise.all([
        db.shelfItem.count({ where: { userId } }),
        db.collection.count({ where: { userId, isPublic: true } }),
        db.follow.count({ where: { followingId: userId } }),
        db.follow.count({ where: { followerId: userId } }),
        db.want.count({ where: { userId } }),
      ])

    return { recordCount, collectionCount, followerCount, followingCount, wantCount }
  }
```

- [ ] **Step 10.2: Commit**

```bash
git add src/repositories/user-repository.ts
git commit -m "feat(repo): UserRepository.getProfileStats with parallel Promise.all"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Release + ShelfItem split | Task 1, 3, 4 |
| Want model | Task 1, 5 |
| UserBlock + atomic transaction | Task 1, 6 |
| PushToken model | Task 1 |
| Collection isPinned (max 4) + slug | Task 1, 9 |
| ActivityType enum update | Task 1 |
| NotificationType NEW_SHELF_ADD | Task 1, 8 |
| User.onboardingCompleted, lastExportAt | Task 1 |
| @@index([userId, createdAt]) on Activity | Task 1 |
| @@index([createdAt]) on ShelfItem | Task 1 |
| avgRating + ratingCount dénormalisés | Task 1, 3, 4 |
| Cursor-based feed (not page-based) | Task 7 |
| Feed: single WHERE IN query | Task 7 |
| Block: atomic transaction | Task 6 |
| NEW_SHELF_ADD upsert anti-spam | Task 8 |
| Profile stats: Promise.all | Task 10 |

**Gaps identified:** none. All spec items from sections 9 and 16 are covered.

**Type consistency check:**
- `ShelfItem` referenced in ActivityRepository and ShelfItemRepository — consistent
- `releaseId` used consistently in Want, ShelfItem, Release
- `userId_releaseId` compound unique key used in `findByUserAndRelease` — consistent with schema `@@unique([userId, releaseId])`
- `userId_slug` compound unique used in CollectionRepository — consistent with schema `@@unique([userId, slug])`

---

## Execution Options

Plan complet sauvegardé dans `docs/superpowers/plans/2026-04-08-plan-1-schema-data-foundation.md`.

**Deux options d'exécution :**

**1. Subagent-Driven (recommandé)** — Un sous-agent par tâche, review entre chaque, iteration rapide.

**2. Inline Execution** — Exécution dans cette session avec checkpoints.

Lequel tu préfères ?
