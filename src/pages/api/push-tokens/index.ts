import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// POST /api/push-tokens
// Body: { token: string, platform: "ios" | "android" | "web" }
export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let token: string, platform: string
  try {
    const body = await request.json()
    token = body?.token
    platform = body?.platform
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!token || !platform) {
    return new Response(JSON.stringify({ error: 'token and platform required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!['ios', 'android', 'web'].includes(platform)) {
    return new Response(JSON.stringify({ error: 'platform must be ios, android, or web' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await db.pushToken.upsert({
      where: { token },
      update: { userId: currentUser.id, platform, updatedAt: new Date() },
      create: { token, userId: currentUser.id, platform },
    })

    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
