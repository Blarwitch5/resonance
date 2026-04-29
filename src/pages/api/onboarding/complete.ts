import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// POST /api/onboarding/complete
export const POST: APIRoute = async ({ locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await db.user.update({
      where: { id: currentUser.id },
      data: { onboardingCompleted: true },
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
