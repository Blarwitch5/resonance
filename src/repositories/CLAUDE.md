# Repositories — Module Guide

All repositories are singleton instances exported from their file.
Import the instance, never instantiate the class directly.

## Pattern

```ts
import { shelfItemRepository } from '../repositories/shelf-item-repository'
```

All DB access goes through repositories. Never import `db` directly in pages or components.

## Index

### shelfItemRepository (`shelf-item-repository.ts`)
User's physical items (vinyl, CD, cassette) — the core entity.
- `findById(id, userId?)` — single item, optional ownership filter
- `findByIdWithRelease(id)` — item + full release data (used in item detail page)
- `findByUserAndRelease(userId, releaseId)` — duplicate check
- `findByUser(userId, opts)` — paginated shelf listing, supports format/sort filters
- `create(data)` — add item to shelf
- `update(id, userId, data)` — update condition/note/acquiredAt (ownership enforced)
- `setRating(id, userId, rating)` — set rating, triggers release recalculation
- `delete(id, userId)` — remove from shelf (ownership enforced)
- `countByUser(userId)` — total count for profile stats
- `getRecent(userId, take)` — last N items added
- `getFriendsWithRelease(currentUserId, releaseId)` — social proof on item detail

### releaseRepository (`release-repository.ts`)
Discogs release data — shared across all users owning the same record.
- `findOrCreateFromDiscogs(discogsId)` — **main entry point**: fetches from Discogs API, upserts, backfills missing fields. Called on item detail page if tracklist/label/year is null.
- `upsertFromDiscogs(data)` — low-level upsert with provided data
- `findByDiscogsId(discogsId)` — lookup by Discogs ID
- `findById(id)` — lookup by internal UUID
- `addRating(releaseId, rating)` — incremental avg update (no full recalc)
- `recalculateRating(releaseId)` — full recalc from all shelf items
- `getTrending(limit)` — most added in last 7 days

### collectionRepository (`collection-repository.ts`)
User-curated collections of shelf items.
- `createWithSlug(data)` — creates collection + auto-generates unique slug
- `findByUser(userId)` — all collections for a user
- `findById(id, userId?)` — single collection
- `findBySlug(userId, slug)` — for public URLs `/u/:username/collections/:slug`
- `getPinned(userId)` — pinned collections for profile header
- `togglePin(id, userId)` — pin/unpin
- `update(id, userId, data)` — name/description/isPublic (ownership enforced)
- `delete(id, userId)` — ownership enforced
- `addItem(collectionId, shelfItemId, userId)` — upsert (idempotent, no duplicates)
- `removeItem(collectionId, shelfItemId, userId)` — ownership enforced

### activityRepository (`activity-repository.ts`)
Social activity feed (ADD_ITEM, RATE_ITEM, etc.).
- `findById(id)` — single activity with likes/comments
- `getFeedForUser(userId, opts)` — cursor-paginated feed of followed users
- `toggleLike(activityId, userId)` — like/unlike
- `createActivity(data)` — create activity entry (called after shelf mutations)

### userRepository (`user-repository.ts`)
User profiles and stats.
- `findById(userId)` — basic profile
- `findByUsername(username)` — for public profile pages
- `findByEmail(email)` — auth lookups
- `updateUser(userId, data)` — generic update
- `getProfileStats(userId)` — shelf count, collections count, followers/following (used in profile header)
- `isFollowing(followerId, followingId)` — quick follow check
- `countWants(userId)` — want list size

### followRepository (`follow-repository.ts`)
Social graph.
- `follow(followerId, followingId)` — creates follow + activity
- `unfollow(followerId, followingId)` — removes follow
- `isFollowing(followerId, followingId)` — boolean check
- `getFollowers(userId)` — list of follower records
- `getFollowing(userId)` — list of following records

### notificationRepository (`notification-repository.ts`)
In-app notifications.
- `create(data)` — create notification
- `upsertShelfAdd(userId, fromUserId)` — anti-spam: max 1 notification per 2h per user pair
- `findByUserId(userId, opts)` — cursor-paginated notifications
- `markAllRead(userId)` / `markOneRead(id, userId)` — read state
- `countUnread(userId)` — badge count

### wantRepository (`want-repository.ts`)
Want list (releases a user wants to acquire).
- `create(userId, releaseId, priority)` — add to want list
- `delete(id, userId)` / `deleteByRelease(userId, releaseId)` — remove
- `findByUser(userId)` — full want list
- `findByUserAndRelease(userId, releaseId)` — existence check
- `countByUser(userId)` — want list size

### blockRepository (`block-repository.ts`)
User blocking.
- `block(blockerId, blockedId)` — block user
- `unblock(blockerId, blockedId)` — unblock
- `isBlocking(blockerId, blockedId)` — one-way check
- `isMutuallyBlocked(userA, userB)` — either direction (used in activity/comment guards)
- `getBlockedIds(userId)` / `getBlockedByIds(userId)` — for feed filtering

### exploreRepository (`explore-repository.ts`)
Discover content.
- `getTrending(limit)` — trending releases (7-day window)
- `getNewActiveMembers(excludeIds, limit)` — recently joined active users
