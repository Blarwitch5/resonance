import type { APIRoute } from 'astro'
import { collectionRepository } from '../../../repositories/collection-repository'
import { safeErrorMessage } from '../../../lib/api-error'
import { stripHtml } from '../../../lib/sanitize'

export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let name: string, description: string | undefined, isPublic: boolean
  try {
    const body = await request.json()
    name = (body?.name ?? '').trim()
    description = body?.description?.trim() || undefined
    isPublic = body?.isPublic !== false // default true
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!name) {
    return new Response(JSON.stringify({ error: 'name required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (name.length > 100) {
    return new Response(JSON.stringify({ error: 'name must be 100 characters or less' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const sanitizedDesc = description ? stripHtml(description) : undefined
    const collection = await collectionRepository.createWithSlug({
      userId: currentUser.id,
      name,
      description: sanitizedDesc,
      isPublic,
    })

    return new Response(JSON.stringify({ collection }), {
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
