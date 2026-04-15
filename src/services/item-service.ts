import { db } from '../lib/db'
import { buildItemSlug, generateUnique4DigitId } from '../lib/slug'
import { itemRepository } from '../repositories/item-repository'

const MAX_SLUG_RETRIES = 20

type CreateItemInput = {
  discogsReleaseId?: string | null
  artistName: string
  albumTitle: string
  format: string
  coverUrl?: string | null
  discogsUrl?: string | null
  year?: number | null
  label?: string | null
  pressing?: string | null
  condition?: string | null
  notes?: string | null
  rating?: number | null
}

type RateItemInput = {
  rating: number
}

async function generateSlug(userId: string, artistName: string, albumTitle: string, year: number | null): Promise<string> {
  let attempts = 0
  while (attempts < MAX_SLUG_RETRIES) {
    const uniqueId = generateUnique4DigitId()
    const slug = buildItemSlug(artistName, albumTitle, year, uniqueId)
    const slugExists = await itemRepository.slugExistsForUser(userId, slug)
    if (!slugExists) return slug
    attempts++
  }
  // Fallback : double unique id
  return buildItemSlug(artistName, albumTitle, year, `${generateUnique4DigitId()}${generateUnique4DigitId()}`)
}

export class ItemService {
  async createItem(userId: string, data: CreateItemInput) {
    const slug = await generateSlug(userId, data.artistName, data.albumTitle, data.year ?? null)

    const createdItem = await itemRepository.create({
      user: { connect: { id: userId } },
      slug,
      artistName: data.artistName,
      albumTitle: data.albumTitle,
      format: data.format,
      discogsReleaseId: data.discogsReleaseId ?? null,
      coverUrl: data.coverUrl ?? null,
      discogsUrl: data.discogsUrl ?? null,
      year: data.year ?? null,
      label: data.label ?? null,
      pressing: data.pressing ?? null,
      condition: data.condition ?? null,
      notes: data.notes ?? null,
      rating: data.rating ?? null,
    })

    // Créer l'activité ADD_ITEM
    await db.activity.create({
      data: {
        userId,
        type: 'ADD_ITEM',
        itemId: createdItem.id,
      },
    })

    return createdItem
  }

  async rateItem(itemId: string, userId: string, data: RateItemInput) {
    const item = await itemRepository.findById(itemId, userId)
    if (!item) throw new Error('Item not found or unauthorized')

    const hasExistingRating = item.rating !== null
    const updatedItem = await itemRepository.update(itemId, { rating: data.rating })

    // Créer activité RATE_ITEM uniquement si nouvelle note (pas une mise à jour)
    if (!hasExistingRating) {
      await db.activity.create({
        data: {
          userId,
          type: 'RATE_ITEM',
          itemId,
        },
      })
    }

    return updatedItem
  }

  async deleteItem(itemId: string, userId: string) {
    const item = await itemRepository.findById(itemId, userId)
    if (!item) throw new Error('Item not found or unauthorized')
    return itemRepository.delete(itemId)
  }

  async updateItem(itemId: string, userId: string, data: Partial<CreateItemInput>) {
    const item = await itemRepository.findById(itemId, userId)
    if (!item) throw new Error('Item not found or unauthorized')
    return itemRepository.update(itemId, data)
  }
}

export const itemService = new ItemService()
