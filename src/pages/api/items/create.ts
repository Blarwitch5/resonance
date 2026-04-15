import type { APIRoute } from 'astro'
import { z } from 'zod'
import { itemService } from '../../../services/item-service'

const createItemSchema = z.object({
  discogsReleaseId: z.string().optional().nullable(),
  artistName: z.string().min(1, 'Artist name is required'),
  albumTitle: z.string().min(1, 'Album title is required'),
  format: z.string().min(1, 'Format is required'),
  coverUrl: z.string().url().optional().nullable(),
  discogsUrl: z.string().url().optional().nullable(),
  year: z.number().int().min(1000).max(9999).optional().nullable(),
  label: z.string().optional().nullable(),
  pressing: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
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
    const validatedData = createItemSchema.parse(body)
    const createdItem = await itemService.createItem(currentUser.id, validatedData)

    return new Response(JSON.stringify(createdItem), {
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
    console.error('Error creating item:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
