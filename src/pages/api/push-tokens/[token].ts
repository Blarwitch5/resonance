import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// DELETE /api/push-tokens/[token]
export const DELETE: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tokenValue = params.token
  if (!tokenValue) {
    return new Response(JSON.stringify({ error: 'Token required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await db.pushToken.deleteMany({
      where: { token: tokenValue, userId: currentUser.id },
    })
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
