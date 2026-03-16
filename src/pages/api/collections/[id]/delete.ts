import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { collectionService } from '../../../../services/collection-service'

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const id = params.id
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing collection ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await collectionService.deleteCollection(id, session.user.id)

    return new Response(null, {
      status: 204,
    })
  } catch (error) {
    console.error('Error deleting collection:', error)

    if (error instanceof Error && error.message === 'Collection not found or unauthorized') {
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

