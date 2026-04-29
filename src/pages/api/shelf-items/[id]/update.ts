import type { APIRoute } from 'astro'
import { shelfItemRepository } from '../../../../repositories/shelf-item-repository'
import { releaseRepository } from '../../../../repositories/release-repository'
import { safeErrorMessage } from '../../../../lib/api-error'
import { stripHtml } from '../../../../lib/sanitize'

// PUT /api/shelf-items/[id]/update
// Body: { condition?: string, note?: string | null, rating?: number | null, acquiredAt?: string | null }
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
    return new Response(JSON.stringify({ error: 'Missing item ID' }), {
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

  const { condition, note, rating, acquiredAt } = body as {
    condition?: string
    note?: string | null
    rating?: number | null
    acquiredAt?: string | null
  }

  const validConditions = ['Mint', 'NM', 'EX', 'VG+', 'VG', 'G']
  if (condition !== undefined && !validConditions.includes(condition)) {
    return new Response(
      JSON.stringify({ error: `condition must be one of: ${validConditions.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (rating !== undefined && rating !== null && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
    return new Response(JSON.stringify({ error: 'rating must be an integer 1–5 or null' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (note && note.length > 2000) {
    return new Response(JSON.stringify({ error: 'note must be 2000 characters or less' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const sanitizedNote = note ? stripHtml(note) : note

    // Update condition/note/acquiredAt
    const updateData: { condition?: string; note?: string | null; acquiredAt?: Date | null } = {}
    if (condition !== undefined) updateData.condition = condition
    if (note !== undefined) updateData.note = sanitizedNote ?? null
    if (acquiredAt !== undefined) updateData.acquiredAt = acquiredAt ? new Date(acquiredAt) : null

    const shelfItem = await shelfItemRepository.update(id, currentUser.id, updateData)

    // Update rating separately (triggers release denormalized recalc)
    if (rating !== undefined) {
      await shelfItemRepository.setRating(id, currentUser.id, rating)
    }

    return new Response(JSON.stringify({ shelfItem }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = safeErrorMessage(error)
    const status = message === 'Item not found or unauthorized' ? 404 : 500
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
