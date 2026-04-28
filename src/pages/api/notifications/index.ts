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
