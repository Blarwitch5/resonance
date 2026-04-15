import type { APIRoute } from 'astro'
import { releaseRepository } from '../../../repositories/release-repository'
import { shelfItemRepository } from '../../../repositories/shelf-item-repository'
import { activityRepository } from '../../../repositories/activity-repository'
import { followRepository } from '../../../repositories/follow-repository'
import { notificationRepository } from '../../../repositories/notification-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// POST /api/shelf-items/create
// Body: { discogsId: string, condition: string, format: string, rating?: number, note?: string, acquiredAt?: string }
export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
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

  const { discogsId, condition, format, rating, note, acquiredAt } = body as {
    discogsId?: string
    condition?: string
    format?: string
    rating?: number
    note?: string
    acquiredAt?: string
  }

  if (!discogsId || !condition || !format) {
    return new Response(
      JSON.stringify({ error: 'discogsId, condition, and format are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const validConditions = ['Mint', 'NM', 'EX', 'VG+', 'VG', 'G']
  if (!validConditions.includes(condition)) {
    return new Response(
      JSON.stringify({ error: `condition must be one of: ${validConditions.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const validFormats = ['Vinyl', 'CD', 'Cassette']
  if (!validFormats.includes(format)) {
    return new Response(
      JSON.stringify({ error: `format must be one of: ${validFormats.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (rating !== undefined && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
    return new Response(JSON.stringify({ error: 'rating must be an integer 1–5' }), {
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
    // 1. Get or create the Release
    const release = await releaseRepository.findOrCreateFromDiscogs(discogsId)
    if (!release) {
      return new Response(JSON.stringify({ error: 'Release not found on Discogs' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Check for duplicate
    const existing = await shelfItemRepository.findByUserAndRelease(currentUser.id, release.id)
    if (existing) {
      return new Response(JSON.stringify({ error: 'Already in your shelf', shelfItem: existing }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Create the ShelfItem
    const sanitizedNote = note ? note.replace(/<[^>]*>/g, '').trim() : undefined
    const shelfItem = await shelfItemRepository.create({
      userId: currentUser.id,
      releaseId: release.id,
      condition,
      rating,
      note: sanitizedNote,
      acquiredAt: acquiredAt ? new Date(acquiredAt) : undefined,
    })

    // 4. Update denormalized rating if provided
    if (rating) {
      await releaseRepository.addRating(release.id, rating)
    }

    // 5. Create ADD_ITEM activity
    const activity = await activityRepository.createActivity({
      userId: currentUser.id,
      type: 'ADD_ITEM',
      shelfItemId: shelfItem.id,
    })

    // 6. Notify followers (anti-spam upsert — max 1 per 2h)
    const followers = await followRepository.getFollowers(currentUser.id)
    await Promise.allSettled(
      followers.map((f) =>
        notificationRepository.upsertShelfAdd(f.followerId, currentUser.id),
      ),
    )

    return new Response(JSON.stringify({ shelfItem, release, activity }), {
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
