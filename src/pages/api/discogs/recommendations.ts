import { safeErrorMessage } from '../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { buildExplorerSlug } from '../../../lib/slug'
import { discogsService } from '../../../services/discogs-service'
import { statsService } from '../../../services/stats-service'

export const GET: APIRoute = async ({ request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(request.url)
    const limit = Number.parseInt(url.searchParams.get('limit') || '10')

    // Récupérer les genres de l'utilisateur
    const topGenres = await statsService.getTopGenres(session.user.id, 3)

    // Générer des recommandations basées sur les genres
    const raw = await discogsService.getRecommendations(topGenres, limit)
    const recommendations = raw.map((item: { id: number; title?: string; year?: number }) => {
      const title = item.title || 'Unknown'
      const [artist, ...titleParts] = title.split(' - ')
      const albumTitle = titleParts.join(' - ') || title
      const artistName = artist || 'Unknown Artist'
      const slug = buildExplorerSlug(artistName, albumTitle, item.year, item.id)
      return { ...item, slug }
    })

    return new Response(JSON.stringify(recommendations), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch (error) {
    console.error('Error getting recommendations:', error)
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

