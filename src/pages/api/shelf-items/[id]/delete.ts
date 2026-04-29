import type { APIRoute } from 'astro'
import { shelfItemRepository } from '../../../../repositories/shelf-item-repository'
import { safeErrorMessage } from '../../../../lib/api-error'

// DELETE /api/shelf-items/[id]/delete
export const DELETE: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { id } = params
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing item ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    await shelfItemRepository.delete(id, currentUser.id)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: error instanceof Error && error.message === 'Item not found or unauthorized' ? 404 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
