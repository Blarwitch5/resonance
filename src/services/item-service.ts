import type { Format, Prisma } from '@prisma/client'
import { db } from '../lib/db'
import { buildItemSlug, generateUnique4DigitId } from '../lib/slug'
import { collectionRepository } from '../repositories/collection-repository'
import { itemRepository } from '../repositories/item-repository'

const MAX_SLUG_RETRIES = 20

export class ItemService {
  async createItem(userId: string, data: Prisma.ItemCreateInput) {
    const artist = (data.artist as string) || ''
    const title = (data.title as string) || ''
    const year = (data.year as number) ?? null
    let slug: string
    let attempts = 0
    do {
      const unique4 = generateUnique4DigitId()
      slug = buildItemSlug(artist, title, year, unique4)
      const exists = await itemRepository.slugExistsForUser(userId, slug)
      if (!exists) break
      attempts++
      if (attempts >= MAX_SLUG_RETRIES) {
        slug = `${slug}-${generateUnique4DigitId()}`
        break
      }
    } while (true)

    return itemRepository.createItem({
      ...data,
      slug,
      user: {
        connect: { id: userId },
      },
    })
  }

  async updateItem(id: string, userId: string, data: Prisma.ItemUpdateInput) {
    // Vérifier que l'item appartient à l'utilisateur
    const item = await itemRepository.findById(id, userId)
    if (!item) {
      throw new Error('Item not found or unauthorized')
    }

    return itemRepository.updateItem(id, data)
  }

  async deleteItem(id: string, userId: string) {
    // Vérifier que l'item appartient à l'utilisateur
    const item = await itemRepository.findById(id, userId)
    if (!item) {
      throw new Error('Item not found or unauthorized')
    }

    return itemRepository.deleteItem(id)
  }

  async toggleFavorite(id: string, userId: string) {
    const item = await itemRepository.findById(id, userId)
    if (!item) {
      throw new Error('Item not found or unauthorized')
    }

    // Vérifier si metadata existe
    if (item.metadata) {
      // Mettre à jour metadata existante
      return db.itemMetadata.update({
        where: { itemId: id },
        data: {
          isFavorite: !item.metadata.isFavorite,
        },
      })
    } else {
      // Créer metadata si elle n'existe pas
      return db.itemMetadata.create({
        data: {
          itemId: id,
          isFavorite: true,
        },
      })
    }
  }

  async addToCollection(itemId: string, userId: string, collectionId: string) {
    // Vérifier que l'item et la collection appartiennent à l'utilisateur
    const [item, collection] = await Promise.all([
      itemRepository.findById(itemId, userId),
      collectionRepository.findById(collectionId, userId),
    ])

    if (!item) {
      throw new Error('Item not found or unauthorized')
    }
    if (!collection) {
      throw new Error('Collection not found or unauthorized')
    }

    return itemRepository.updateItem(itemId, {
      collection: {
        connect: { id: collectionId },
      },
    })
  }

  async removeFromCollection(itemId: string, userId: string) {
    const item = await itemRepository.findById(itemId, userId)
    if (!item) {
      throw new Error('Item not found or unauthorized')
    }

    return itemRepository.updateItem(itemId, {
      collection: {
        disconnect: true,
      },
    })
  }

  async getItemsByFormatWithCollections(userId: string, format: Format) {
    const items = await itemRepository.findByUserId(userId, format)

    // Grouper par collection
    const itemsByCollection = items.reduce((acc, item) => {
      const key = item.collectionId || 'no-collection'
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(item)
      return acc
    }, {} as Record<string, typeof items>)

    return itemsByCollection
  }

  async duplicateItem(id: string, userId: string) {
    const item = await itemRepository.findById(id, userId)
    if (!item) {
      throw new Error('Item not found or unauthorized')
    }

    const {
      id: _id,
      createdAt,
      updatedAt,
      addedAt,
      userId: _uid,
      collectionId,
      metadata,
      collection,
      ...itemData
    } = item

    return this.createItem(userId, {
      ...itemData,
      user: { connect: { id: userId } },
      collection: collectionId ? { connect: { id: collectionId } } : undefined,
    })
  }
}

export const itemService = new ItemService()

