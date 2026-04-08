import { safeErrorMessage } from '../../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { itemService } from '../../../../services/item-service'

export const POST: APIRoute = async ({ params, request }) => {
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
      return new Response(JSON.stringify({ error: 'Missing item ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const metadata = await itemService.toggleFavorite(id, session.user.id)

    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error toggling favorite:', error)

    if (error instanceof Error && error.message === 'Item not found or unauthorized') {
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

