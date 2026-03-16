import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { discogsService } from '../../../../services/discogs-service'

export const GET: APIRoute = async ({ params, request }) => {
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
      return new Response(JSON.stringify({ error: 'Missing release ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const releaseId = Number.parseInt(id)
    if (Number.isNaN(releaseId)) {
      return new Response(JSON.stringify({ error: 'Invalid release ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const release = await discogsService.getRelease(releaseId)

    return new Response(JSON.stringify(release), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error fetching release:', error)
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

