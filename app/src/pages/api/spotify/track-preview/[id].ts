import type { APIRoute } from 'astro'
import { deezerService } from '../../../../services/deezer-service'
import { spotifyService } from '../../../../services/spotify-service'

export const prerender = false

/**
 * Endpoint pour récupérer l'URL de preview d'une track
 * Supporte Spotify et Deezer
 * GET /api/spotify/track-preview/[id]?source=spotify|deezer
 */
export const GET: APIRoute = async ({ params, url }) => {
  try {
    const trackId = params.id
    const source = url.searchParams.get('source') || 'spotify' // Par défaut Spotify pour compatibilité

    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'Missing track ID' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Essayer Spotify en premier si demandé et configuré
    if (source === 'spotify' && spotifyService.isConfigured()) {
      try {
        const track = await spotifyService.getTrackById(trackId)
        if (track && track.preview_url) {
          return new Response(
            JSON.stringify({
              preview_url: track.preview_url,
              duration_ms: track.duration_ms,
              name: track.name,
              artists: track.artists.map((a) => a.name),
              source: 'spotify',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      } catch (error) {
        console.warn('Spotify track-preview failed, falling back to Deezer:', error)
      }
    }

    // Fallback sur Deezer
    const deezerTrack = await deezerService.getTrackById(Number.parseInt(trackId))
    if (deezerTrack && deezerTrack.preview) {
      const normalized = deezerService.normalizeTrack(deezerTrack)
      return new Response(
        JSON.stringify({
          preview_url: normalized.preview_url,
          duration_ms: normalized.duration_ms,
          name: normalized.name,
          artists: normalized.artists,
          source: 'deezer',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({ error: 'Track not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in Spotify track-preview endpoint:', error)

    if (error instanceof Error && error.message.includes('rate limit')) {
      return new Response(
        JSON.stringify({
          error: 'Spotify API rate limit exceeded. Please try again later.',
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        error: 'Failed to get track preview',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
