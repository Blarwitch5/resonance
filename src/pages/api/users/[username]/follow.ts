import type { APIRoute } from 'astro'
import { blockRepository } from '../../../../repositories/block-repository'
import { followRepository } from '../../../../repositories/follow-repository'
import { notificationRepository } from '../../../../repositories/notification-repository'
import { userRepository } from '../../../../repositories/user-repository'
import { safeErrorMessage } from '../../../../lib/api-error'

export const POST: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const targetUsername = params.username
  if (!targetUsername) {
    return new Response(JSON.stringify({ error: 'Username required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const targetUser = await userRepository.findByUsername(targetUsername)
  if (!targetUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (targetUser.id === currentUser.id) {
    return new Response(JSON.stringify({ error: 'Cannot follow yourself' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Reject if either party has blocked the other
  const isMutuallyBlocked = await blockRepository.isMutuallyBlocked(
    currentUser.id,
    targetUser.id,
  )
  if (isMutuallyBlocked) {
    return new Response(JSON.stringify({ error: 'Action not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const isAlreadyFollowing = await followRepository.isFollowing(currentUser.id, targetUser.id)

    if (isAlreadyFollowing) {
      await followRepository.unfollow(currentUser.id, targetUser.id)
      return new Response(JSON.stringify({ following: false }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await followRepository.follow(currentUser.id, targetUser.id)

    await notificationRepository.create({
      userId: targetUser.id,
      type: 'NEW_FOLLOWER',
      fromUserId: currentUser.id,
    })

    return new Response(JSON.stringify({ following: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
