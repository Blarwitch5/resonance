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
