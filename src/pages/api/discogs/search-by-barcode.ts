import { safeErrorMessage } from '../../../lib/api-error'
import type { APIRoute } from 'astro'
import { discogsService } from '../../../services/discogs-service'
import { checkRateLimit, retryAfterSeconds } from '../../../lib/rate-limit'
import { cacheGet, cacheSet } from '../../../lib/discogs-cache'

// Control characters regex
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
    // Rate limit: 10 requests per minute per IP (barcode scanner)
    const ip = getClientIp(request)
    if (!checkRateLimit(`discogs-barcode:${ip}`, 10, 60_000)) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSeconds(`discogs-barcode:${ip}`)),
        },
      })
    }

    const url = new URL(request.url)
    const rawBarcode = url.searchParams.get('barcode') ?? ''
    const barcode = rawBarcode.trim().slice(0, 200)

    if (!barcode) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: barcode' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (CONTROL_CHARS.test(barcode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid characters in barcode' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Cache lookup
    const cacheKey = `barcode:${barcode}`
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

    const results = await discogsService.searchByBarcode(barcode, 1, 15)

    const payload = results.results && results.results.length > 0
      ? { success: true, found: true, results: results.results, result: results.results[0] }
      : { success: true, found: false, message: 'No album found with this barcode' }

    if ((payload as { found: boolean }).found) {
      cacheSet(cacheKey, payload)
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
        'X-Cache': 'MISS',
      },
    })
  } catch (error) {
    console.error('Error searching by barcode:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: safeErrorMessage(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
