import { safeErrorMessage } from '../../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { itemService } from '../../../../services/item-service'

/**
 * Endpoint pour changer la collection d'un item
 * POST /api/items/[id]/change-collection
 * Body: { collectionId: string | null }
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

    const data = await request.json()
    const collectionId = data.collectionId === null || data.collectionId === '' ? null : data.collectionId

    // Si collectionId est null, retirer de la collection
    if (collectionId === null) {
      const item = await itemService.removeFromCollection(itemId, session.user.id)
      return new Response(JSON.stringify(item), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Sinon, ajouter à la collection
    const item = await itemService.addToCollection(itemId, session.user.id, collectionId)

    return new Response(JSON.stringify(item), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error changing item collection:', error)

    if (
      error instanceof Error &&
      (error.message === 'Item not found or unauthorized' ||
        error.message === 'Collection not found or unauthorized')
    ) {
      return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
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
