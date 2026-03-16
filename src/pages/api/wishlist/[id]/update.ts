import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { wishlistRepository } from '../../../../repositories/wishlist-repository'
import { z } from 'zod'

const updateWishlistSchema = z.object({
  priority: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
})

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const id = params.id
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing wishlist item ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Vérifier que l'item appartient à l'utilisateur
    const existing = await wishlistRepository.findById(id, session.user.id)
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Wishlist item not found or unauthorized' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json()
    const validatedData = updateWishlistSchema.parse(body)

    const updated = await wishlistRepository.updateWishlistItem(id, validatedData)

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error updating wishlist item:', error)

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
