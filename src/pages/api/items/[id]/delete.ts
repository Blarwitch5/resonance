import { safeErrorMessage } from '../../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { itemRepository } from '../../../../repositories/item-repository'

export const prerender = false

/**
 * Endpoint pour supprimer complètement un item
 * DELETE /api/items/[id]
 */
export const DELETE: APIRoute = async ({ params, request }) => {
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

    // Vérifier que l'item appartient à l'utilisateur
    const item = await itemRepository.findById(itemId)
    if (!item || item.userId !== session.user.id) {
      return new Response(JSON.stringify({ error: 'Item not found or unauthorized' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Supprimer l'item
    await itemRepository.deleteItem(itemId)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Album supprimé de votre bibliothèque',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error deleting item:', error)

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
