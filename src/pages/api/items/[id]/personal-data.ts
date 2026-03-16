import { Prisma } from '@prisma/client'
import type { APIRoute } from 'astro'
import { z } from 'zod'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db'
import { itemRepository } from '../../../../repositories/item-repository'

export const prerender = false

const CONDITION_VALUES = ['MINT', 'NEAR_MINT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'] as const

const PersonalDataSchema = z.object({
  personalNotes: z.string().max(5000).nullable().optional(),
  acquisitionDate: z.string().nullable().optional(),
  purchasePrice: z.number().min(0).nullable().optional(),
  condition: z
    .union([z.enum(CONDITION_VALUES), z.literal(''), z.null()])
    .optional()
    .transform((value) => (value === '' || value === null ? null : value)),
  purchaseLocation: z.string().max(500).nullable().optional(),
  customTags: z.array(z.string().max(50)).max(10).optional(),
  personalRating: z.number().min(1).max(5).nullable().optional(),
})

/**
 * PUT /api/items/[id]/personal-data
 * Body: Partial<PersonalData>
 */
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const itemId = params.id
    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Missing item ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const item = await itemRepository.findById(itemId, session.user.id)
    if (!item) {
      return new Response(JSON.stringify({ error: 'Item not found or unauthorized' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const raw = await request.json()
    const parsed = PersonalDataSchema.safeParse(raw)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Validation error', details: parsed.error.flatten() }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const data = parsed.data

    const acquisitionDate =
      data.acquisitionDate === '' ||
      data.acquisitionDate === null ||
      data.acquisitionDate === undefined
        ? undefined
        : new Date(data.acquisitionDate as string)
    const acquisitionDateValue =
      acquisitionDate !== undefined
        ? (isNaN(acquisitionDate.getTime()) ? null : acquisitionDate)
        : undefined

    const condition = data.condition

    const customTagsJson =
      data.customTags === undefined
        ? undefined
        : data.customTags === null || data.customTags.length === 0
          ? null
          : JSON.stringify(data.customTags)

    const updateData: Record<string, unknown> = {}
    if (data.personalNotes !== undefined) updateData.personalNotes = data.personalNotes
    if (acquisitionDateValue !== undefined) updateData.acquisitionDate = acquisitionDateValue
    if (data.purchasePrice !== undefined)
      updateData.purchasePrice =
        data.purchasePrice == null ? null : new Prisma.Decimal(data.purchasePrice)
    if (condition !== undefined) updateData.condition = condition
    if (data.purchaseLocation !== undefined) updateData.purchaseLocation = data.purchaseLocation
    if (customTagsJson !== undefined) updateData.customTags = customTagsJson
    if (data.personalRating !== undefined) updateData.personalRating = data.personalRating

    const metadata = await db.itemMetadata.upsert({
      where: { itemId },
      create: {
        itemId,
        ...(Object.keys(updateData).length > 0 ? updateData : {}),
      },
      update: updateData,
    })

    const serializable = {
      ...metadata,
      purchasePrice:
        metadata.purchasePrice != null ? Number(metadata.purchasePrice) : null,
      personalRating:
        metadata.personalRating != null ? Number(metadata.personalRating) : null,
      acquisitionDate:
        metadata.acquisitionDate != null
          ? metadata.acquisitionDate.toISOString()
          : null,
    }

    return new Response(JSON.stringify(serializable), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error updating personal data:', error)
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('Error details:', (error as Error).message)
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
