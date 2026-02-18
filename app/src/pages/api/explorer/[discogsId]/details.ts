import type { APIRoute } from 'astro'
import { discogsService } from '../../../../services/discogs-service'

export const prerender = false

/**
 * Endpoint pour récupérer les détails d'un album depuis Discogs
 * GET /api/explorer/[discogsId]/details
 * 
 * Retourne les détails complets sans créer d'item dans la base
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    const discogsIdParam = params.discogsId

    if (!discogsIdParam) {
      return new Response(
        JSON.stringify({ error: 'Missing discogsId parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const discogsId = Number.parseInt(discogsIdParam, 10)

    if (Number.isNaN(discogsId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid discogsId parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Récupérer les détails depuis Discogs
    const release = await discogsService.getRelease(discogsId)

    return new Response(
      JSON.stringify({
        release: {
          id: release.id,
          title: release.title,
          artists: release.artists,
          year: release.year,
          genres: release.genres || [],
          styles: release.styles || [],
          country: release.country,
          labels: release.labels || [],
          formats: release.formats || [],
          tracklist: release.tracklist || [],
          notes: release.notes,
          identifiers: release.identifiers || [],
          videos: release.videos || [],
          community: release.community,
          master_id: release.master_id,
          master_url: release.master_url,
          released: release.released,
          released_formatted: release.released_formatted,
          cover_image: release.cover_image || release.thumb,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error fetching Discogs release details:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return new Response(
        JSON.stringify({ error: 'Release not found on Discogs' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch release details',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
