import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// DELETE /api/collections/purge-all
// Deletes all collections belonging to the authenticated user.
export const DELETE: APIRoute = async ({ locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { count } = await db.collection.deleteMany({
      where: { userId: currentUser.id },
    })

    return new Response(JSON.stringify({ deleted: count }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
