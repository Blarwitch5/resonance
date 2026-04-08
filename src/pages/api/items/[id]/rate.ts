import { safeErrorMessage } from '../../../../lib/api-error'
import type { APIRoute } from 'astro'
import { z } from 'zod'
import { itemService } from '../../../../services/item-service'

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
})

export const POST: APIRoute = async ({ params, request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const itemId = params.id
  if (!itemId) {
    return new Response(JSON.stringify({ error: 'Item ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const validatedData = rateSchema.parse(body)
    const updatedItem = await itemService.rateItem(itemId, currentUser.id, validatedData)

    return new Response(JSON.stringify(updatedItem), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: error.issues }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
