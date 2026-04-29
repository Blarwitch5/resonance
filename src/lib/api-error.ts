/**
 * Known user-facing error messages that are safe to expose to the client.
 * All other errors return a generic 500 message to avoid leaking internal details
 * (Prisma constraint names, table/column structure, stack traces).
 */
const SAFE_MESSAGES = new Set([
  'Item not found or unauthorized',
  'Collection not found or unauthorized',
  'User not found',
  'Unauthorized',
  'Missing item ID',
  'Missing collection ID',
  'Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.',
  'File too large. Maximum size is 5MB.',
  'No file provided',
  'Avatar upload is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel.',
])

/**
 * Returns an error message safe to send to the client.
 * Known domain errors pass through; unknown errors return a generic message.
 */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && SAFE_MESSAGES.has(error.message)) {
    return error.message
  }
  return 'Internal server error'
}

/**
 * Builds a standard JSON error Response.
 * Use this in catch blocks instead of exposing error.message directly.
 */
export function errorResponse(error: unknown, status = 500): Response {
  const message = safeErrorMessage(error)
  const resolvedStatus = status === 500 && message !== 'Internal server error' ? 400 : status
  return new Response(JSON.stringify({ error: message }), {
    status: resolvedStatus,
    headers: { 'Content-Type': 'application/json' },
  })
}
