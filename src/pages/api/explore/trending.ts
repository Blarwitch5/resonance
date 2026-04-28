import type { APIRoute } from 'astro'
import { exploreRepository } from '../../../repositories/explore-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/explore/trending
export const GET: APIRoute = async () => {
  try {
    const trending = await exploreRepository.getTrending(10)
    return new Response(JSON.stringify({ trending }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
