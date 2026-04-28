import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// PATCH /api/profile/notification-prefs
// Body: { push?: { follower?: boolean, shelfAdd?: boolean, like?: boolean, comment?: boolean },
//         email?: { follower?: boolean, comment?: boolean } }
export const PATCH: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let prefs: Record<string, unknown>
  try {
    prefs = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { notificationPrefs: true },
    })
    const existing = (user?.notificationPrefs as Record<string, unknown>) ?? {}
    const merged = { ...existing, ...prefs }

    await db.user.update({
      where: { id: currentUser.id },
      data: { notificationPrefs: merged },
    })

    return new Response(JSON.stringify({ notificationPrefs: merged }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
