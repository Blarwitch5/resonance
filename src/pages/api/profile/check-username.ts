import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'
import { checkRateLimit, retryAfterSeconds } from '../../../lib/rate-limit'

const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/
const RESERVED = new Set([
  'admin', 'api', 'settings', 'login', 'signup', 'onboarding',
  'profile', 'u', 'feed', 'explore', 'help', 'about', 'terms',
  'privacy', 'null', 'undefined',
])

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  )
}

function suggestAlternatives(base: string): string[] {
  const b = base.slice(0, 17)
  return [
    `${b}_${Math.floor(Math.random() * 99) + 1}`,
    `${b}_${Math.floor(Math.random() * 999) + 100}`,
    `the_${b}`.slice(0, 20),
  ]
}

export const GET: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ip = getClientIp(request)
  if (!checkRateLimit(`check-username:${ip}`, 30, 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds(`check-username:${ip}`)),
      },
    })
  }

  const url = new URL(request.url)
  const username = url.searchParams.get('username')?.trim() ?? ''

  if (!username) {
    return new Response(JSON.stringify({ error: 'Missing username' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!USERNAME_REGEX.test(username)) {
    return new Response(JSON.stringify({ available: false, reason: 'invalid' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (RESERVED.has(username)) {
    return new Response(JSON.stringify({ available: false, reason: 'reserved' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Don't count self as taken (user updating their own username)
  const existing = await db.user.findUnique({
    where: { username },
    select: { id: true },
  })

  const isSelf = existing?.id === session.user.id
  if (existing && !isSelf) {
    return new Response(
      JSON.stringify({
        available: false,
        reason: 'taken',
        suggestions: suggestAlternatives(username),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify({ available: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
