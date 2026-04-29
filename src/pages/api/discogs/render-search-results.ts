import type { APIRoute } from 'astro'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import SearchResultsGrid from '../../../components/explorer/SearchResultsGrid.astro'
import { checkRateLimit, retryAfterSeconds } from '../../../lib/rate-limit'

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  )
}

export const POST: APIRoute = async ({ request }) => {
  // Rate limit: 30 requests per minute per IP (public endpoint)
  const ip = getClientIp(request)
  if (!checkRateLimit(`discogs-render:${ip}`, 30, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds(`discogs-render:${ip}`)),
      },
    })
  }

  try {
    const body = await request.json()
    const { results, resultsCountLabel, noImageLabel, unknownArtistLabel, addToCollectionAria, addToWishlistAria, scriptLabels } = body ?? {}

    if (!results || !Array.isArray(results)) {
      return new Response(JSON.stringify({ error: 'Invalid results format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const container = await AstroContainer.create()
    const html = await container.renderToString(SearchResultsGrid, {
      props: {
        results,
        resultsCountLabel: resultsCountLabel ?? undefined,
        noImageLabel: noImageLabel ?? undefined,
        unknownArtistLabel: unknownArtistLabel ?? undefined,
        addToCollectionAria: addToCollectionAria ?? undefined,
        addToWishlistAria: addToWishlistAria ?? undefined,
        scriptLabels: scriptLabels ?? undefined,
      },
    })

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('Error rendering search results:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
