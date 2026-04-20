/**
 * In-memory sliding-window rate limiter.
 * NOTE: Vercel Edge/Serverless functions don't share memory across instances —
 * this is best-effort protection. For strict rate limiting at scale, use
 * Vercel KV (Upstash Redis) or a Middleware-based approach.
 */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

/** Returns true if the request is within the allowed limit, false if rate-limited. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

/** Returns seconds until the window resets, for Retry-After headers. */
export function retryAfterSeconds(key: string): number {
  const entry = store.get(key)
  if (!entry) return 0
  return Math.ceil((entry.resetAt - Date.now()) / 1000)
}

// Cleanup stale entries every 5 minutes to avoid memory leaks on long-running processes
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of store) {
    if (v.resetAt <= now) store.delete(k)
  }
}, 5 * 60 * 1000)
