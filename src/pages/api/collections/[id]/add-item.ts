import { safeErrorMessage } from '../../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { collectionService } from '../../../../services/collection-service'

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const collectionId = params.id
    if (!collectionId) {
      return new Response(JSON.stringify({ error: 'Missing collection ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await request.json()
    const itemId = data.itemId

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Missing itemId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const item = await collectionService.addItemToCollection(collectionId, session.user.id, itemId)

    return new Response(JSON.stringify(item), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error adding item to collection:', error)

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

