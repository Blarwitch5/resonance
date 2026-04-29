import type { APIRoute } from 'astro'
import { collectionRepository } from '../../../../repositories/collection-repository'
import { safeErrorMessage } from '../../../../lib/api-error'
import { db } from '../../../../lib/db'

// DELETE /api/collections/[id]
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
    return new Response(JSON.stringify({ error: 'Missing collection ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const existing = await collectionRepository.findById(id, currentUser.id)
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Collection not found or unauthorized' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await db.collection.delete({ where: { id } })
    return new Response(null, { status: 204 })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
