import type { APIRoute } from 'astro'
import { collectionRepository } from '../../../../repositories/collection-repository'
import { safeErrorMessage } from '../../../../lib/api-error'
import { db } from '../../../../lib/db'

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

// PUT /api/collections/[id]
export const PUT: APIRoute = async ({ params, request, locals }) => {
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
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

    const updateData: { name?: string; description?: string | null; isPublic?: boolean; slug?: string } = {}

    if (typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim().slice(0, 100)
      updateData.slug = toSlug(updateData.name) || existing.slug
    }
    if (typeof body.description === 'string') {
      updateData.description = body.description.replace(/<[^>]*>/g, '').trim() || null
    }
    if (typeof body.isPublic === 'boolean') {
      updateData.isPublic = body.isPublic
    }

    const collection = await db.collection.update({
      where: { id },
      data: updateData,
    })

    return new Response(JSON.stringify({ collection }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
