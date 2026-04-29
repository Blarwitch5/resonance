import type { APIRoute } from 'astro'
import { deezerService } from '../../../services/deezer-service'
import { auth } from '../../../lib/auth'

export const GET: APIRoute = async ({ url, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const artist = url.searchParams.get('artist') ?? ''
  const track = url.searchParams.get('track') ?? ''

  if (!artist || !track) {
    return new Response(JSON.stringify({ error: 'artist and track params required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const result = await deezerService.searchTrack(artist, track)

  return new Response(
    JSON.stringify({
      track: result
        ? {
            preview_url: result.preview || null,
            deezer_url: result.link,
            duration_ms: result.duration * 1000,
          }
        : null,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  )
}
