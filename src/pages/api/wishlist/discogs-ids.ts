import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { wishlistRepository } from '../../../repositories/wishlist-repository'

export const GET: APIRoute = async ({ request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const discogsIds = await wishlistRepository.findDiscogsIdsByUserId(session.user.id)

    return new Response(JSON.stringify({ discogsIds }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error listing wishlist discogs ids:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
