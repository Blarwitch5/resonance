import type { APIRoute } from 'astro'
import { z } from 'zod'
import { db } from '../../../lib/db'
import { wishlistRepository } from '../../../repositories/wishlist-repository'

const createWishlistSchema = z.object({
  discogsReleaseId: z.string().min(1, 'Discogs release ID is required'),
  artistName: z.string().min(1, 'Artist name is required'),
  albumTitle: z.string().min(1, 'Album title is required'),
  format: z.string().min(1, 'Format is required'),
  coverUrl: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.string().url().optional(),
  ),
  discogsUrl: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.string().url().optional(),
  ),
  year: z.preprocess(
    (value) => (value === null || value === 0 ? undefined : value),
    z.number().int().min(1000).max(9999).optional(),
  ),
  label: z.preprocess(
    (value) => (value === null || value === '' ? undefined : value),
    z.string().optional(),
  ),
})

export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const validatedData = createWishlistSchema.parse(body)

    // Vérifier doublon
    const existing = await wishlistRepository.findByDiscogsReleaseId(
      currentUser.id,
      validatedData.discogsReleaseId,
    )
    if (existing) {
      return new Response(
        JSON.stringify({ error: 'This album is already in your wishlist' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const wishlistItem = await wishlistRepository.create({
      userId: currentUser.id,
      ...validatedData,
    })

    // Créer l'activité ADD_WANT
    await db.activity.create({
      data: {
        userId: currentUser.id,
        type: 'ADD_WANT',
        wishlistItemId: wishlistItem.id,
      },
    })

    return new Response(JSON.stringify(wishlistItem), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    console.error('Error creating wishlist item:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
