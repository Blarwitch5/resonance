# Plan 2 — Social Core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement block/unblock, comments, notification center (API + page), and push token registration.

**Architecture:** Each social action is an API endpoint that uses a repository for DB access. The notification anti-spam upsert uses a database `upsert` to avoid race conditions — no locks. Block checks are added to follow and like endpoints. The notifications page is a server-rendered Astro page using `locals.user`.

**Tech Stack:** Astro 6 API routes, Prisma, TypeScript, `locals.user` auth pattern

**Spec:** `docs/superpowers/specs/2026-04-08-social-refactor-design.md` — sections 13, 14, 24

**Depends on:** Plan 1 (block-repository.ts, notification-repository.ts anti-spam upsert, NotificationType enum)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/repositories/notification-repository.ts` | Modify | Add `upsertShelfAdd` + `markRead` by ID + `findWithDetails` |
| `src/pages/api/users/[username]/block.ts` | Create | POST block, DELETE unblock |
| `src/pages/api/users/[username]/follow.ts` | Modify | Add mutual block check before follow |
| `src/pages/api/activities/[id]/like.ts` | Modify | Add block check before like |
| `src/pages/api/activities/[id]/comment.ts` | Create | POST create comment, DELETE delete own comment |
| `src/pages/api/notifications/index.ts` | Create | GET list notifications with count |
| `src/pages/api/notifications/read.ts` | Create | PATCH mark read (all or single) |
| `src/pages/api/push-tokens/index.ts` | Create | POST register token |
| `src/pages/api/push-tokens/[token].ts` | Create | DELETE remove token |
| `src/pages/notifications.astro` | Create | Notification center page |

---

## Task 1: Extend `notification-repository.ts` with anti-spam upsert and full list query

**Files:**
- Modify: `src/repositories/notification-repository.ts`

- [ ] **Step 1.1: Add `upsertShelfAdd` method**

The anti-spam rule: one grouped notification per (userId, fromUserId) per 2-hour window. `windowStart` is computed as the start of the current 2-hour slot. The upsert is atomic — no race condition.

Replace the full content of `src/repositories/notification-repository.ts` with:

```typescript
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
   * Anti-spam upsert for NEW_SHELF_ADD.
   * Groups notifications from the same follower within a 2-hour window.
   * windowStart = floor(now / 2h) * 2h
   */
  async upsertShelfAdd(userId: string, fromUserId: string) {
    const now = new Date()
    const twoHours = 2 * 60 * 60 * 1000
    const windowStart = new Date(Math.floor(now.getTime() / twoHours) * twoHours)

    await db.notification.upsert({
      where: {
        userId_fromUserId_type_windowStart: {
          userId,
          fromUserId,
          type: 'NEW_SHELF_ADD',
          windowStart,
        },
      },
      update: {
        count: { increment: 1 },
        read: false,
        createdAt: now,
      },
      create: {
        userId,
        fromUserId,
        type: 'NEW_SHELF_ADD',
        windowStart,
        count: 1,
        read: false,
      },
    })
  }

  async findByUserId(
    userId: string,
    options: { onlyUnread?: boolean; take?: number; cursor?: string } = {},
  ) {
    const { onlyUnread = false, take = 50, cursor } = options
    return db.notification.findMany({
      where: { userId, ...(onlyUnread && { read: false }) },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        fromUser: { select: { id: true, name: true, image: true } },
        activity: { select: { id: true, type: true, shelfItemId: true } },
      },
    })
  }

  async markAllRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
  }

  async markOneRead(notificationId: string, userId: string) {
    return db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    })
  }

  async countUnread(userId: string) {
    return db.notification.count({ where: { userId, read: false } })
  }
}

export const notificationRepository = new NotificationRepository()
```

> **Note:** The `upsert` requires a unique constraint on `(userId, fromUserId, type, windowStart)` in the schema. Plan 1 adds this. The Prisma client generates the key name `userId_fromUserId_type_windowStart` — verify it matches by running `pnpm prisma generate` after Plan 1 is complete.

> **Note:** `Notification` model needs `fromUser`, `activity` relations and `count`, `windowStart` fields added in Plan 1 schema migration. If Plan 1 is not complete, this step will fail TypeScript validation — run Plan 1 first.

- [ ] **Step 1.2: Verify TypeScript compiles**

```bash
pnpm build 2>&1 | head -30
```

Expected: no TypeScript errors in `notification-repository.ts`. If errors appear about missing fields (`count`, `windowStart`, `fromUser`), Plan 1's schema migration is not yet applied — run `pnpm prisma generate` first.

- [ ] **Step 1.3: Commit**

```bash
git add src/repositories/notification-repository.ts
git commit -m "feat(notifications): add anti-spam upsert and full list query"
```

---

## Task 2: Block/unblock API endpoint

**Files:**
- Create: `src/pages/api/users/[username]/block.ts`

- [ ] **Step 2.1: Create the block/unblock endpoint**

```typescript
import type { APIRoute } from 'astro'
import { blockRepository } from '../../../../repositories/block-repository'
import { userRepository } from '../../../../repositories/user-repository'
import { safeErrorMessage } from '../../../../lib/api-error'

// POST /api/users/[username]/block  → block user
export const POST: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const targetUsername = params.username
  if (!targetUsername) {
    return new Response(JSON.stringify({ error: 'Username required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const targetUser = await userRepository.findByUsername(targetUsername)
  if (!targetUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (targetUser.id === currentUser.id) {
    return new Response(JSON.stringify({ error: 'Cannot block yourself' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Atomic: deletes follow (both directions) + creates UserBlock
    await blockRepository.block(currentUser.id, targetUser.id)
    return new Response(JSON.stringify({ blocked: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// DELETE /api/users/[username]/block  → unblock user
export const DELETE: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const targetUsername = params.username
  if (!targetUsername) {
    return new Response(JSON.stringify({ error: 'Username required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const targetUser = await userRepository.findByUsername(targetUsername)
  if (!targetUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await blockRepository.unblock(currentUser.id, targetUser.id)
    return new Response(JSON.stringify({ blocked: false }), {
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

- [ ] **Step 2.2: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | head -20
```

Expected: no errors in the new file.

- [ ] **Step 2.3: Commit**

```bash
git add src/pages/api/users/[username]/block.ts
git commit -m "feat(social): add block/unblock API endpoint"
```

---

## Task 3: Add block check to follow and like endpoints

**Files:**
- Modify: `src/pages/api/users/[username]/follow.ts`
- Modify: `src/pages/api/activities/[id]/like.ts`

- [ ] **Step 3.1: Update follow endpoint to reject blocked pairs**

Replace the content of `src/pages/api/users/[username]/follow.ts` with:

```typescript
import type { APIRoute } from 'astro'
import { blockRepository } from '../../../../repositories/block-repository'
import { followRepository } from '../../../../repositories/follow-repository'
import { notificationRepository } from '../../../../repositories/notification-repository'
import { userRepository } from '../../../../repositories/user-repository'
import { safeErrorMessage } from '../../../../lib/api-error'

export const POST: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const targetUsername = params.username
  if (!targetUsername) {
    return new Response(JSON.stringify({ error: 'Username required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const targetUser = await userRepository.findByUsername(targetUsername)
  if (!targetUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (targetUser.id === currentUser.id) {
    return new Response(JSON.stringify({ error: 'Cannot follow yourself' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Reject if either party has blocked the other
  const isMutuallyBlocked = await blockRepository.isMutuallyBlocked(
    currentUser.id,
    targetUser.id,
  )
  if (isMutuallyBlocked) {
    return new Response(JSON.stringify({ error: 'Action not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const isAlreadyFollowing = await followRepository.isFollowing(currentUser.id, targetUser.id)

    if (isAlreadyFollowing) {
      await followRepository.unfollow(currentUser.id, targetUser.id)
      return new Response(JSON.stringify({ following: false }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await followRepository.follow(currentUser.id, targetUser.id)

    await notificationRepository.create({
      userId: targetUser.id,
      type: 'NEW_FOLLOWER',
      fromUserId: currentUser.id,
    })

    return new Response(JSON.stringify({ following: true }), {
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

- [ ] **Step 3.2: Update like endpoint to reject blocked pairs**

Replace the content of `src/pages/api/activities/[id]/like.ts` with:

```typescript
import type { APIRoute } from 'astro'
import { activityRepository } from '../../../../repositories/activity-repository'
import { blockRepository } from '../../../../repositories/block-repository'
import { notificationRepository } from '../../../../repositories/notification-repository'
import { safeErrorMessage } from '../../../../lib/api-error'

export const POST: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const activityId = params.id
  if (!activityId) {
    return new Response(JSON.stringify({ error: 'Activity ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const activity = await activityRepository.findById(activityId)
    if (!activity) {
      return new Response(JSON.stringify({ error: 'Activity not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Reject if either party has blocked the other
    const isMutuallyBlocked = await blockRepository.isMutuallyBlocked(
      currentUser.id,
      activity.userId,
    )
    if (isMutuallyBlocked) {
      return new Response(JSON.stringify({ error: 'Action not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await activityRepository.toggleLike(activityId, currentUser.id)

    // Notify the activity owner on like (not on unlike)
    if (result.liked && activity.userId !== currentUser.id) {
      await notificationRepository.create({
        userId: activity.userId,
        type: 'ACTIVITY_LIKE',
        fromUserId: currentUser.id,
        activityId,
      })
    }

    return new Response(JSON.stringify(result), {
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

> **Note:** `activityRepository.findById` must exist. If it doesn't, add it to `activity-repository.ts`:
> ```typescript
> async findById(id: string) {
>   return db.activity.findUnique({ where: { id } })
> }
> ```

> **Note:** `blockRepository.isMutuallyBlocked(a, b)` must exist (defined in Plan 1's block-repository.ts). It checks whether `a` blocked `b` OR `b` blocked `a`.

- [ ] **Step 3.3: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no TypeScript errors.

- [ ] **Step 3.4: Commit**

```bash
git add src/pages/api/users/[username]/follow.ts src/pages/api/activities/[id]/like.ts
git commit -m "feat(social): add mutual block checks to follow and like endpoints"
```

---

## Task 4: Comment API endpoint

**Files:**
- Create: `src/pages/api/activities/[id]/comment.ts`

- [ ] **Step 4.1: Create comment endpoint (POST create, DELETE delete own)**

```typescript
import type { APIRoute } from 'astro'
import { activityRepository } from '../../../../repositories/activity-repository'
import { blockRepository } from '../../../../repositories/block-repository'
import { notificationRepository } from '../../../../repositories/notification-repository'
import { db } from '../../../../lib/db'
import { safeErrorMessage } from '../../../../lib/api-error'

// POST /api/activities/[id]/comment
export const POST: APIRoute = async ({ params, request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const activityId = params.id
  if (!activityId) {
    return new Response(JSON.stringify({ error: 'Activity ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let text: string
  try {
    const body = await request.json()
    text = (body?.text ?? '').trim()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!text || text.length === 0) {
    return new Response(JSON.stringify({ error: 'Comment text required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (text.length > 280) {
    return new Response(JSON.stringify({ error: 'Comment must be 280 characters or less' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Sanitize: strip HTML tags
  const sanitized = text.replace(/<[^>]*>/g, '')

  try {
    const activity = await activityRepository.findById(activityId)
    if (!activity) {
      return new Response(JSON.stringify({ error: 'Activity not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const isMutuallyBlocked = await blockRepository.isMutuallyBlocked(
      currentUser.id,
      activity.userId,
    )
    if (isMutuallyBlocked) {
      return new Response(JSON.stringify({ error: 'Action not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const comment = await db.activityComment.create({
      data: {
        activityId,
        userId: currentUser.id,
        text: sanitized,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })

    // Notify the activity owner (not self-comment)
    if (activity.userId !== currentUser.id) {
      await notificationRepository.create({
        userId: activity.userId,
        type: 'ACTIVITY_COMMENT',
        fromUserId: currentUser.id,
        activityId,
      })
    }

    return new Response(JSON.stringify({ comment }), {
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

// DELETE /api/activities/[id]/comment?commentId=xxx
export const DELETE: APIRoute = async ({ params, url, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const commentId = url.searchParams.get('commentId')
  if (!commentId) {
    return new Response(JSON.stringify({ error: 'commentId query param required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const comment = await db.activityComment.findUnique({ where: { id: commentId } })
    if (!comment) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (comment.userId !== currentUser.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await db.activityComment.delete({ where: { id: commentId } })
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

- [ ] **Step 4.2: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 4.3: Commit**

```bash
git add src/pages/api/activities/[id]/comment.ts
git commit -m "feat(social): add comment create/delete endpoint with block check and notification"
```

---

## Task 5: Notifications API

**Files:**
- Create: `src/pages/api/notifications/index.ts`
- Create: `src/pages/api/notifications/read.ts`

- [ ] **Step 5.1: Create notifications list endpoint**

Create `src/pages/api/notifications/index.ts`:

```typescript
import type { APIRoute } from 'astro'
import { notificationRepository } from '../../../repositories/notification-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/notifications?cursor=xxx&unread=true
export const GET: APIRoute = async ({ url, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const cursor = url.searchParams.get('cursor') ?? undefined
  const onlyUnread = url.searchParams.get('unread') === 'true'

  try {
    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.findByUserId(currentUser.id, {
        onlyUnread,
        take: 30,
        cursor,
      }),
      notificationRepository.countUnread(currentUser.id),
    ])

    const nextCursor =
      notifications.length === 30 ? notifications[notifications.length - 1].id : null

    return new Response(JSON.stringify({ notifications, unreadCount, nextCursor }), {
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

- [ ] **Step 5.2: Create mark-read endpoint**

Create `src/pages/api/notifications/read.ts`:

```typescript
import type { APIRoute } from 'astro'
import { notificationRepository } from '../../../repositories/notification-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// PATCH /api/notifications/read
// Body: { id?: string }  — if id absent, marks all as read
export const PATCH: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const id: string | undefined = body?.id

    if (id) {
      await notificationRepository.markOneRead(id, currentUser.id)
    } else {
      await notificationRepository.markAllRead(currentUser.id)
    }

    return new Response(JSON.stringify({ ok: true }), {
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

- [ ] **Step 5.3: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 5.4: Commit**

```bash
git add src/pages/api/notifications/index.ts src/pages/api/notifications/read.ts
git commit -m "feat(notifications): add list and mark-read API endpoints"
```

---

## Task 6: Push token API

**Files:**
- Create: `src/pages/api/push-tokens/index.ts`
- Create: `src/pages/api/push-tokens/[token].ts`

- [ ] **Step 6.1: Create push token registration endpoint**

Create `src/pages/api/push-tokens/index.ts`:

```typescript
import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// POST /api/push-tokens
// Body: { token: string, platform: "ios" | "android" | "web" }
export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let token: string, platform: string
  try {
    const body = await request.json()
    token = body?.token
    platform = body?.platform
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!token || !platform) {
    return new Response(JSON.stringify({ error: 'token and platform required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!['ios', 'android', 'web'].includes(platform)) {
    return new Response(JSON.stringify({ error: 'platform must be ios, android, or web' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await db.pushToken.upsert({
      where: { token },
      update: { userId: currentUser.id, platform, updatedAt: new Date() },
      create: { token, userId: currentUser.id, platform },
    })

    return new Response(JSON.stringify({ ok: true }), {
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

- [ ] **Step 6.2: Create push token deletion endpoint**

Create `src/pages/api/push-tokens/[token].ts`:

```typescript
import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// DELETE /api/push-tokens/[token]
export const DELETE: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tokenValue = params.token
  if (!tokenValue) {
    return new Response(JSON.stringify({ error: 'Token required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await db.pushToken.deleteMany({
      where: { token: tokenValue, userId: currentUser.id },
    })
    return new Response(JSON.stringify({ ok: true }), {
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

- [ ] **Step 6.3: Verify TypeScript**

```bash
pnpm build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 6.4: Commit**

```bash
git add src/pages/api/push-tokens/index.ts src/pages/api/push-tokens/[token].ts
git commit -m "feat(push): add push token register/delete API"
```

---

## Task 7: Notifications page

**Files:**
- Create: `src/pages/notifications.astro`

- [ ] **Step 7.1: Create the notifications center page**

```astro
---
import Layout from '../components/layouts/Layout.astro'
import { notificationRepository } from '../repositories/notification-repository'
import { auth } from '../lib/auth'

const session = await auth.api.getSession({ headers: Astro.request.headers })
if (!session) return Astro.redirect('/login')

const userId = session.user.id

const [notifications, unreadCount] = await Promise.all([
  notificationRepository.findByUserId(userId, { take: 50 }),
  notificationRepository.countUnread(userId),
])

// Mark all as read when page is visited
await notificationRepository.markAllRead(userId)
---

<Layout title="Notifications">
  <div class="notifications-page max-w-2xl mx-auto px-4 py-6">
    <header class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold">Notifications</h1>
      {unreadCount > 0 && (
        <span class="text-sm text-muted">{unreadCount} non lues</span>
      )}
    </header>

    {notifications.length === 0 && (
      <p class="text-center text-muted py-12">Aucune notification pour l'instant.</p>
    )}

    <ul class="space-y-2" role="list" aria-label="Notifications">
      {notifications.map((notif) => (
        <li
          class={`notification-item p-4 rounded-lg border ${!notif.read ? 'bg-surface-raised border-accent/20' : 'bg-surface border-border'}`}
          data-id={notif.id}
        >
          <div class="flex items-start gap-3">
            {notif.fromUser?.image && (
              <img
                src={notif.fromUser.image}
                alt={notif.fromUser.name ?? ''}
                width="40"
                height="40"
                class="rounded-full w-10 h-10 object-cover flex-shrink-0"
              />
            )}
            <div class="flex-1 min-w-0">
              <p class="text-sm">
                {notif.type === 'NEW_FOLLOWER' && (
                  <><strong>{notif.fromUser?.name}</strong> a commencé à te suivre.</>
                )}
                {notif.type === 'NEW_SHELF_ADD' && (
                  <>
                    <strong>{notif.fromUser?.name}</strong>{' '}
                    {notif.count && notif.count > 1
                      ? `a ajouté ${notif.count} disques à sa shelf.`
                      : 'a ajouté un disque à sa shelf.'}
                  </>
                )}
                {notif.type === 'ACTIVITY_LIKE' && (
                  <><strong>{notif.fromUser?.name}</strong> a aimé ton activité.</>
                )}
                {notif.type === 'ACTIVITY_COMMENT' && (
                  <><strong>{notif.fromUser?.name}</strong> a commenté ton activité.</>
                )}
              </p>
              <p class="text-xs text-muted mt-1">
                {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {notif.type === 'NEW_FOLLOWER' && notif.fromUser && (
              <a
                href={`/u/${notif.fromUser.name}`}
                class="text-sm text-accent hover:underline flex-shrink-0"
              >
                Voir profil
              </a>
            )}
            {(notif.type === 'ACTIVITY_LIKE' || notif.type === 'ACTIVITY_COMMENT') &&
              notif.activity && (
                <a
                  href={`/items/${notif.activity.shelfItemId}`}
                  class="text-sm text-accent hover:underline flex-shrink-0"
                >
                  Voir
                </a>
              )}
          </div>
        </li>
      ))}
    </ul>
  </div>
</Layout>
```

> **Note:** This page marks all notifications as read on load. This is intentional UX — simpler than per-notification read tracking on the page itself. The badge count updates on next load.

> **Note:** The `fromUser.name` used in the profile link is the display name, not the username. You may need to include `username` in the `fromUser` select in `notificationRepository.findByUserId`. Update the select:
> ```typescript
> fromUser: { select: { id: true, name: true, image: true, username: true } },
> ```
> Then use `notif.fromUser.username` in the href.

- [ ] **Step 7.2: Verify the build**

```bash
pnpm build 2>&1 | grep -E "(error|Error)" | grep -v "node_modules" | head -20
```

Expected: no build errors.

- [ ] **Step 7.3: Commit**

```bash
git add src/pages/notifications.astro
git commit -m "feat(notifications): add notifications center page"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Block/unblock endpoint (section 24) — Task 2
- ✅ Block check on follow (section 24) — Task 3
- ✅ Block check on like (section 24) — Task 3
- ✅ Comment create/delete with 280 char limit (section 13) — Task 4
- ✅ Comment notification (section 14) — Task 4
- ✅ Like notification (section 14) — Task 3
- ✅ NEW_SHELF_ADD anti-spam upsert (section 14) — Task 1
- ✅ Notification list + unread count (section 14) — Task 5
- ✅ Mark read (individual or all) (section 14) — Task 5
- ✅ Push token register/delete (section 14) — Task 6
- ✅ Notifications page `/notifications` (section 14) — Task 7

**Missing from this plan (covered in later plans):**
- Email notification sending for NEW_FOLLOWER + ACTIVITY_COMMENT (Plan 7 — Capacitor/integrations)
- Push notification delivery (Plan 7 — Capacitor)
- NEW_SHELF_ADD trigger from shelf item creation (Plan 3 — Feed/Item Detail)
- Notification badge in header/bottom bar (Plan 3 — UI)
- Blocked users list in settings (Plan 6 — Settings)
