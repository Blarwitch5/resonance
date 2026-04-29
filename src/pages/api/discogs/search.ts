import { safeErrorMessage } from '../../../lib/api-error'
import type { Format } from '@prisma/client'
import type { APIRoute } from 'astro'
import { buildExplorerSlug } from '../../../lib/slug'
import { discogsService } from '../../../services/discogs-service'
import { checkRateLimit, retryAfterSeconds } from '../../../lib/rate-limit'
import { cacheGet, cacheSet, normalizeCacheKey } from '../../../lib/discogs-cache'

// Control characters regex (U+0000–U+001F and U+007F)
const CONTROL_CHARS = /[\x00-\x1F\x7F]/

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  )
}

export const GET: APIRoute = async ({ request }) => {
  try {
    // Rate limit: 30 requests per minute per IP (public endpoint)
    const ip = getClientIp(request)
    if (!checkRateLimit(`discogs-search:${ip}`, 30, 60_000)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds(`discogs-search:${ip}`)),
        },
      })
    }

    const url = new URL(request.url)
    const rawQuery = url.searchParams.get('q') ?? ''

    // Sanitize: trim, max 200 chars, reject control characters
    const query = rawQuery.trim().slice(0, 200)
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: q (query)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (CONTROL_CHARS.test(query)) {
      return new Response(
        JSON.stringify({ error: 'Invalid characters in query' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const formatParam = url.searchParams.get('format')
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1'))
    const perPage = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get('per_page') || '24')))
    const format = formatParam ? (formatParam.toUpperCase() as Format) : undefined

    // Cache lookup (keyed on normalized query + format + page)
    const cacheKey = normalizeCacheKey(`${query}|${format ?? ''}|${page}|${perPage}`)
    const cached = cacheGet<object>(cacheKey)
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600',
          'X-Cache': 'HIT',
        },
      })
    }

    const results = await discogsService.search(query, format, page, perPage)

    const onlyReleases = (results.results || []).filter((item) => item.type === 'release')
    const resultsWithSlug = onlyReleases.map((item) => {
      const title = item.title || 'Unknown'
      const [artist, ...titleParts] = title.split(' - ')
      const albumTitle = titleParts.join(' - ') || title
      const artistName = artist || 'Unknown Artist'
      const slug = buildExplorerSlug(artistName, albumTitle, item.year, item.id)
      return { ...item, slug }
    })

    const payload = { ...results, results: resultsWithSlug }
    cacheSet(cacheKey, payload)

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
        'X-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('Error searching Discogs:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: safeErrorMessage(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
