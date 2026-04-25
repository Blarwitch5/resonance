# lib/ — Utilities Guide

Shared utilities. Import directly, no instantiation needed.

## Index

### `db.ts`
```ts
import { db } from '../lib/db'
```
Prisma client singleton. Only used inside repositories — never import directly in pages or API routes.

### `auth.ts` / `auth-client.ts`
```ts
import { auth } from '../lib/auth'           // server-side Better Auth instance
import { authClient, signIn, signOut } from '../lib/auth-client' // client-side
```
Better Auth configuration. `auth` handles sessions, OAuth, password reset.
Trusted origins include Vite dev server ports (4321, 4322) — required for dev CORS.

### `sanitize.ts`
```ts
import { stripHtml } from '../lib/sanitize'
```
Strips HTML tags, comments, CDATA from user input before DB persistence.
Use on any free-text user field (notes, comments, descriptions). Never use raw regex.

### `rate-limit.ts`
```ts
import { checkRateLimit, retryAfterSeconds } from '../lib/rate-limit'
// checkRateLimit(key, limit, windowMs) → false = over limit
```
In-memory rate limiter. Used on public endpoints (Discogs search, barcode, username check).
Key format: `'discogs-search:' + ip` or `'username-check:' + ip`.

### `api-error.ts`
```ts
import { safeErrorMessage, errorResponse } from '../lib/api-error'
```
- `safeErrorMessage(error)` — extracts message, never leaks stack traces
- `errorResponse(error, status)` — shorthand for error JSON Response

### `db-errors.ts`
```ts
import { isDatabaseUnreachable, logDatabaseUnreachableOnce } from '../lib/db-errors'
```
Detects Prisma connection errors. Used in middleware to return 503 gracefully.

### `slug.ts`
```ts
import { slugify, buildItemSlug, buildExplorerSlug, parseExplorerSlug, looksLikeItemId } from '../lib/slug'
```
- `slugify(text)` — URL-safe slug
- `buildItemSlug(artist, title, year, id)` — shelf item URL slug
- `buildExplorerSlug(discogsId)` — explorer page slug
- `parseExplorerSlug(slug)` — extract Discogs ID from slug
- `looksLikeItemId(param)` — detect UUID vs slug in route params

### `discogs-cache.ts`
```ts
import { cacheGet, cacheSet, normalizeCacheKey } from '../lib/discogs-cache'
```
In-memory TTL cache for Discogs API responses. 5-minute window.

### `notify-new-user.ts`
```ts
import { notifyNewUser } from '../lib/notify-new-user'
```
Sends internal notification when a new user registers (Discord webhook or similar).
