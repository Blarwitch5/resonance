import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/users/search?q=xxx
export const GET: APIRoute = async ({ url, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const q = url.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return new Response(JSON.stringify({ users: [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const users = await db.user.findMany({
      where: {
        id: { not: currentUser.id },
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, username: true, imageUrl: true },
      take: 10,
    })
    return new Response(JSON.stringify({ users }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
