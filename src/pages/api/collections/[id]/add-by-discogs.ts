import { safeErrorMessage } from '../../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { collectionService } from '../../../../services/collection-service'

/**
 * POST /api/collections/[id]/add-by-discogs
 * Body: { discogsId: number, title, artist, format, year?, genre?, country?, label?, barcode?, coverUrl? }
 * Ajoute une release Discogs à la collection (réutilise un item existant non classé ou en crée un nouveau).
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

    const collectionId = params.id
    if (!collectionId) {
      return new Response(JSON.stringify({ error: 'Missing collection ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await request.json()
    const discogsId =
      typeof data.discogsId === 'number' ? data.discogsId : Number.parseInt(String(data.discogsId), 10)
    if (Number.isNaN(discogsId)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid discogsId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const format = data.format ?? 'VINYL'
    if (!['VINYL', 'CD', 'CASSETTE'].includes(format)) {
      return new Response(JSON.stringify({ error: 'Invalid format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!data.title || !data.artist) {
      return new Response(JSON.stringify({ error: 'Missing title or artist' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const releaseData = {
      title: String(data.title),
      artist: String(data.artist),
      format: format as 'VINYL' | 'CD' | 'CASSETTE',
      year: data.year != null ? Number(data.year) : null,
      genre: data.genre != null ? String(data.genre) : null,
      country: data.country != null ? String(data.country) : null,
      label: data.label != null ? String(data.label) : null,
      barcode: data.barcode != null ? String(data.barcode) : null,
      coverUrl: data.coverUrl != null ? String(data.coverUrl) : null,
    }

    const result = await collectionService.addByDiscogsId(
      collectionId,
      session.user.id,
      discogsId,
      releaseData,
    )

    return new Response(
      JSON.stringify({
        item: result.item,
        alreadyInCollection: result.alreadyInCollection ?? false,
      }),
      {
        status: result.alreadyInCollection ? 200 : 201,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error adding by discogs to collection:', error)

    if (
      error instanceof Error &&
      error.message === 'Collection not found or unauthorized'
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
