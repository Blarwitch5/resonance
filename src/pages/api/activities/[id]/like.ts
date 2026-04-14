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
