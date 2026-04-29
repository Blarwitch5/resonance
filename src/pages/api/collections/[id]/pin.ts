import type { APIRoute } from 'astro'
import { collectionRepository } from '../../../../repositories/collection-repository'
import { safeErrorMessage } from '../../../../lib/api-error'

// POST /api/collections/[id]/pin
export const POST: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'Collection ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = await collectionRepository.togglePin(id, currentUser.id)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'MAX_PINNED') {
      return new Response(
        JSON.stringify({ error: 'Tu ne peux épingler que 4 collections maximum.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
