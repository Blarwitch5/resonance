import type { APIRoute } from 'astro'
import { blockRepository } from '../../../../repositories/block-repository'
import { userRepository } from '../../../../repositories/user-repository'
import { safeErrorMessage } from '../../../../lib/api-error'

// POST /api/users/[username]/block  → block user
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
    return new Response(JSON.stringify({ error: 'Cannot block yourself' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Atomic: deletes follow (both directions) + creates UserBlock
    await blockRepository.block(currentUser.id, targetUser.id)
    return new Response(JSON.stringify({ blocked: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// DELETE /api/users/[username]/block  → unblock user
export const DELETE: APIRoute = async ({ params, locals }) => {
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

  try {
    await blockRepository.unblock(currentUser.id, targetUser.id)
    return new Response(JSON.stringify({ blocked: false }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
