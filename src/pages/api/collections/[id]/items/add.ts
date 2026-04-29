import type { APIRoute } from 'astro'
import { collectionRepository } from '../../../../../repositories/collection-repository'
import { safeErrorMessage } from '../../../../../lib/api-error'

// POST /api/collections/[id]/items/add
// Body: { shelfItemId: string }
export const POST: APIRoute = async ({ params, request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id: collectionId } = params
  if (!collectionId) {
    return new Response(JSON.stringify({ error: 'Missing collection ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const shelfItemId = typeof body.shelfItemId === 'string' ? body.shelfItemId.trim() : null
  if (!shelfItemId) {
    return new Response(JSON.stringify({ error: 'shelfItemId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const collectionItem = await collectionRepository.addItem(collectionId, shelfItemId, currentUser.id)
    return new Response(JSON.stringify({ collectionItem }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = safeErrorMessage(error)
    const status = message === 'Collection not found' ? 404 : 500
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
