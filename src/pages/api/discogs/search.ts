import type { Format } from '@prisma/client'
import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { buildExplorerSlug } from '../../../lib/slug'
import { discogsService } from '../../../services/discogs-service'

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
    const query = url.searchParams.get('q')
    const formatParam = url.searchParams.get('format')
    const page = Number.parseInt(url.searchParams.get('page') || '1')
    const perPage = Number.parseInt(url.searchParams.get('per_page') || '24')

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: q (query)' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const format = formatParam ? (formatParam.toUpperCase() as Format) : undefined

    const results = await discogsService.search(query, format, page, perPage)

    // Ne garder que les vraies releases pour que l'id corresponde bien
    // à /releases/{id} sur la page /explorer/[slug].
    const onlyReleases = (results.results || []).filter((item) => item.type === 'release')

    const resultsWithSlug = onlyReleases.map((item) => {
      const title = item.title || 'Unknown'
      const [artist, ...titleParts] = title.split(' - ')
      const albumTitle = titleParts.join(' - ') || title
      const artistName = artist || 'Unknown Artist'
      const slug = buildExplorerSlug(artistName, albumTitle, item.year, item.id)
      return { ...item, slug }
    })

    return new Response(
      JSON.stringify({ ...results, results: resultsWithSlug }),
      {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('Error searching Discogs:', error)
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

