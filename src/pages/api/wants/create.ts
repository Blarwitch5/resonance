import type { APIRoute } from 'astro'
import { wantRepository } from '../../../repositories/want-repository'
import { activityRepository } from '../../../repositories/activity-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// POST /api/wants/create
// Body: { releaseId: string, priority?: "high" | "normal" }
export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let releaseId: string, priority: 'high' | 'normal'
  try {
    const body = await request.json()
    releaseId = body?.releaseId
    priority = body?.priority === 'high' ? 'high' : 'normal'
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!releaseId) {
    return new Response(JSON.stringify({ error: 'releaseId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const want = await wantRepository.create(currentUser.id, releaseId, priority)

    await activityRepository.createActivity({
      userId: currentUser.id,
      type: 'ADD_WANT',
      shelfItemId: undefined,
    })

    return new Response(JSON.stringify({ want }), {
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
