import type { APIRoute } from 'astro'
import { activityRepository } from '../../repositories/activity-repository'
import { safeErrorMessage } from '../../lib/api-error'

// GET /api/feed?cursor=xxx&take=20
export const GET: APIRoute = async ({ url, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const cursor = url.searchParams.get('cursor') ?? undefined
  const take = Math.min(Number(url.searchParams.get('take') ?? '20'), 50)

  try {
    const result = await activityRepository.getFeedForUser(currentUser.id, { take, cursor })
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
