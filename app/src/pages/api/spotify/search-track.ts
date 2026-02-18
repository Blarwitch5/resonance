import type { APIRoute } from 'astro'
import { deezerService } from '../../../services/deezer-service'
import { spotifyService } from '../../../services/spotify-service'

export const prerender = false

/**
 * Endpoint pour rechercher une track sur Spotify
 * GET /api/spotify/search-track?q=artist track (recommandé)
 * GET /api/spotify/search-track?artist=...&track=... (alternatif)
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    // Support pour deux formats de query :
    // 1. ?q=artist track (format utilisé par TrackList)
    // 2. ?artist=...&track=... (format original)
    const query = url.searchParams.get('q')
    let artist: string | null = null
    let trackName: string | null = null

    if (query) {
      // Parser la query "artist track" - format de fallback
      // Note: Le format recommandé est ?artist=...&track=... pour une meilleure précision
      const parts = query.trim().split(/\s+/)
      if (parts.length >= 2) {
        // Heuristique simple : prendre les 2 premiers mots comme artist si 4+ mots total
        // Sinon, prendre le premier mot comme artist
        if (parts.length >= 4) {
          artist = parts.slice(0, 2).join(' ')
          trackName = parts.slice(2).join(' ')
        } else if (parts.length === 3) {
          artist = parts[0]
          trackName = parts.slice(1).join(' ')
        } else {
          artist = parts[0]
          trackName = parts[1]
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid query format. Use ?q=artist track or ?artist=...&track=...' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
    } else {
      artist = url.searchParams.get('artist')
      trackName = url.searchParams.get('track')
    }

    if (!artist || !trackName) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters. Use ?q=artist track or ?artist=...&track=...' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Essayer Spotify en premier si configuré (pour compatibilité future)
    let trackResult = null
    let source = 'deezer'

    if (spotifyService.isConfigured()) {
      try {
        const spotifyTrack = await spotifyService.searchTrack(artist, trackName)
        if (spotifyTrack && spotifyTrack.preview_url) {
          trackResult = {
            id: spotifyTrack.id,
            name: spotifyTrack.name,
            artists: spotifyTrack.artists.map((a) => a.name),
            preview_url: spotifyTrack.preview_url,
            duration_ms: spotifyTrack.duration_ms,
            spotify_url: spotifyTrack.external_urls.spotify,
          }
          source = 'spotify'
        }
      } catch (error) {
        console.warn('Spotify search failed, falling back to Deezer:', error)
      }
    }

    // Fallback sur Deezer si Spotify n'est pas disponible ou n'a pas trouvé
    if (!trackResult) {
      const deezerTrack = await deezerService.searchTrack(artist, trackName)
      if (deezerTrack) {
        const normalized = deezerService.normalizeTrack(deezerTrack)
        trackResult = {
          id: normalized.id,
          name: normalized.name,
          artists: normalized.artists,
          preview_url: normalized.preview_url,
          duration_ms: normalized.duration_ms,
          deezer_url: normalized.deezer_url,
        }
        source = 'deezer'
      }
    }

    if (!trackResult || !trackResult.preview_url) {
      return new Response(
        JSON.stringify({ track: null, preview_url: null }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        track: {
          ...trackResult,
          source, // Indiquer la source pour debug
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in Spotify search-track endpoint:', error)

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
        error: 'Failed to search Spotify track',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
