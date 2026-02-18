import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { wishlistRepository } from '../../../repositories/wishlist-repository'
import { z } from 'zod'

const createWishlistSchema = z.object({
  discogsId: z.number().int().positive(),
  title: z.string().min(1),
  artist: z.string().min(1),
  year: z.number().int().positive().optional(),
  genre: z.string().optional(),
  coverUrl: z.string().url().optional().or(z.literal('')),
  format: z.enum(['VINYL', 'CD', 'CASSETTE']),
  priority: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
})

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()
    const validatedData = createWishlistSchema.parse(body)

    // Vérifier si l'item existe déjà dans la wishlist
    const existing = await wishlistRepository.findByDiscogsId(
      validatedData.discogsId,
      session.user.id,
    )

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Cet album est déjà dans votre wishlist' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const wishlistItem = await wishlistRepository.createWishlistItem({
      discogsId: validatedData.discogsId,
      title: validatedData.title,
      artist: validatedData.artist,
      year: validatedData.year,
      genre: validatedData.genre,
      coverUrl: validatedData.coverUrl || null,
      format: validatedData.format,
      priority: validatedData.priority || 1,
      notes: validatedData.notes,
      user: {
        connect: { id: session.user.id },
      },
    })

    return new Response(JSON.stringify(wishlistItem), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating wishlist item:', error)

    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
