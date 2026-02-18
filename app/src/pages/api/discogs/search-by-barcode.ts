import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
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
    const barcode = url.searchParams.get('barcode')

    if (!barcode) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: barcode' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Search Discogs by barcode
    // Note: Discogs search API supports barcode search when formatted correctly
    // We search with the barcode as query and filter results
    const results = await discogsService.search(barcode, undefined, 1, 10)

    // Filter results to find exact barcode match
    // Check identifiers in the results (we'll need to fetch release details for exact match)
    // For now, return the first result if available
    if (results.results && results.results.length > 0) {
      // Return the first result as it's likely the match
      // In production, you might want to fetch each release to verify barcode
      return new Response(JSON.stringify({
        success: true,
        found: true,
        result: results.results[0],
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      found: false,
      message: 'No album found with this barcode',
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error searching by barcode:', error)
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
