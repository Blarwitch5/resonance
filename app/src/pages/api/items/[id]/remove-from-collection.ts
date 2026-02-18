import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { itemService } from '../../../../services/item-service'

export const prerender = false

/**
 * Endpoint pour retirer un item de sa collection actuelle
 * POST /api/items/[id]/remove-from-collection
 */
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const itemId = params.id
    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Missing item ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const item = await itemService.removeFromCollection(itemId, session.user.id)

    return new Response(
      JSON.stringify({
        success: true,
        item,
        message: 'Album retiré de la collection',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error removing item from collection:', error)

    if (error instanceof Error && error.message === 'Item not found or unauthorized') {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

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
