import type { APIRoute } from 'astro'
import { Prisma } from '@prisma/client'
import { auth } from '../../../lib/auth'
import { wishlistRepository } from '../../../repositories/wishlist-repository'
import { z } from 'zod'

/**
 * Le client envoie souvent `null` pour year / genre / coverUrl (JSON.stringify).
 * Zod `.optional()` n’accepte que `undefined`, pas `null` — d’où des échecs de parse.
 */
const createWishlistSchema = z.object({
  discogsId: z.coerce.number().int().positive(),
  title: z.string().min(1),
  artist: z.string().min(1),
  year: z.preprocess(
    (value) => (value === null || value === undefined || value === 0 ? undefined : value),
    z.number().int().positive().optional(),
  ),
  genre: z.preprocess(
    (value) => (value === null || value === undefined ? undefined : value),
    z.string().optional(),
  ),
  coverUrl: z.preprocess(
    (value) => (value === null || value === undefined || value === '' ? undefined : value),
    z.string().url().optional(),
  ),
  format: z.enum(['VINYL', 'CD', 'CASSETTE']),
  priority: z.number().int().min(1).max(5).optional(),
  notes: z.preprocess(
    (value) => (value === null || value === undefined ? undefined : value),
    z.string().optional(),
  ),
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
        JSON.stringify({ error: 'This album is already in your wishlist' }),
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
      return new Response(JSON.stringify({ error: 'Invalid input', details: error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new Response(
          JSON.stringify({ error: 'This album is already in your wishlist' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (error.code === 'P2003') {
        return new Response(JSON.stringify({ error: 'Invalid user reference' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
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
