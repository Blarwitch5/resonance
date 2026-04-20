/**
 * Simple in-memory TTL cache for Discogs search results.
 * Key = normalized query string. TTL = 10 minutes.
 * Same serverless caveat as rate-limit.ts — per-instance, not global.
 */

const TTL_MS = 10 * 60 * 1000

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.value as T
}

export function cacheSet<T>(key: string, value: T): void {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS })
}

/** Normalize a search query for use as cache key. */
export function normalizeCacheKey(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ')
}

// GC stale entries every 15 minutes
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k)
  }
}, 15 * 60 * 1000)
