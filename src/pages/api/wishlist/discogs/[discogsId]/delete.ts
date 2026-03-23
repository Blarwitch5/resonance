import type { APIRoute } from 'astro'
import { auth } from '../../../../../lib/auth'
import { wishlistRepository } from '../../../../../repositories/wishlist-repository'

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const discogsIdRaw = params.discogsId
    if (!discogsIdRaw) {
      return new Response(JSON.stringify({ error: 'Missing discogsId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const discogsId = Number.parseInt(discogsIdRaw, 10)
    if (Number.isNaN(discogsId) || discogsId <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid discogsId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const existing = await wishlistRepository.findByDiscogsId(discogsId, session.user.id)
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Wishlist item not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await wishlistRepository.deleteWishlistItem(existing.id)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error deleting wishlist item by discogsId:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

