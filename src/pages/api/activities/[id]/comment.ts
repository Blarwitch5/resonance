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
export const DELETE: APIRoute = async ({ params: _params, url, locals }) => {
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
