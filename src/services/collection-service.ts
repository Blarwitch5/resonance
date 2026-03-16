import { collectionRepository } from '../repositories/collection-repository'
import { itemRepository } from '../repositories/item-repository'
import { db } from '../lib/db'
import type { Prisma } from '@prisma/client'

export class CollectionService {
  async createCollection(userId: string, data: Prisma.CollectionCreateInput) {
    return collectionRepository.createCollection({
      ...data,
      user: {
        connect: { id: userId },
      },
    })
  }

  async updateCollection(id: string, userId: string, data: Prisma.CollectionUpdateInput) {
    const collection = await collectionRepository.findById(id, userId)
    if (!collection) {
      throw new Error('Collection not found or unauthorized')
    }

    return collectionRepository.updateCollection(id, data)
  }

  async deleteCollection(id: string, userId: string) {
    const collection = await collectionRepository.findById(id, userId)
    if (!collection) {
      throw new Error('Collection not found or unauthorized')
    }

    return collectionRepository.deleteCollection(id)
  }

  async addItemToCollection(collectionId: string, userId: string, itemId: string) {
    const [collection, item] = await Promise.all([
      collectionRepository.findById(collectionId, userId),
      db.item.findFirst({
        where: { id: itemId, userId },
      }),
    ])

    if (!collection) {
      throw new Error('Collection not found or unauthorized')
    }
    if (!item) {
      throw new Error('Item not found or unauthorized')
    }

    return db.item.update({
      where: { id: itemId },
      data: {
        collection: {
          connect: { id: collectionId },
        },
      },
    })
  }

  /**
   * Ajoute une release Discogs à une collection (trouve un item existant ou en crée un).
   * Retourne { item, alreadyInCollection: true } si l'album est déjà dans cette collection.
   */
  async addByDiscogsId(
    collectionId: string,
    userId: string,
    discogsId: number,
    releaseData: {
      title: string
      artist: string
      format: 'VINYL' | 'CD' | 'CASSETTE'
      year?: number | null
      genre?: string | null
      country?: string | null
      label?: string | null
      barcode?: string | null
      coverUrl?: string | null
    },
  ): Promise<{ item: Awaited<ReturnType<typeof db.item.update>>; alreadyInCollection?: boolean }> {
    const collection = await collectionRepository.findById(collectionId, userId)
    if (!collection) {
      throw new Error('Collection not found or unauthorized')
    }

    const existingInCollection = await itemRepository.findByDiscogsIdAndUserId(
      discogsId,
      userId,
      collectionId,
    )
    if (existingInCollection) {
      return { item: existingInCollection, alreadyInCollection: true }
    }

    const existingUnassigned = await itemRepository.findByDiscogsIdAndUserId(discogsId, userId, null)
    if (existingUnassigned) {
      const updated = await db.item.update({
        where: { id: existingUnassigned.id },
        data: { collection: { connect: { id: collectionId } } },
        include: { metadata: true, collection: true },
      })
      return { item: updated }
    }

    const { itemService } = await import('./item-service')
    const created = await itemService.createItem(userId, {
      ...releaseData,
      discogsId,
      user: { connect: { id: userId } },
      collection: { connect: { id: collectionId } },
    })
    return { item: created }
  }

  async removeItemFromCollection(collectionId: string, userId: string, itemId: string) {
    const collection = await collectionRepository.findById(collectionId, userId)
    if (!collection) {
      throw new Error('Collection not found or unauthorized')
    }

    return db.item.update({
      where: { id: itemId },
      data: {
        collection: {
          disconnect: true,
        },
      },
    })
  }

  async getCollectionWithItems(collectionId: string, userId: string) {
    return collectionRepository.findById(collectionId, userId)
  }

  async getPublicCollections(userId: string) {
    return db.collection.findMany({
      where: {
        userId,
        isPublic: true,
      },
      include: {
        items: {
          include: {
            metadata: true,
          },
          take: 6,
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async togglePublic(id: string, userId: string) {
    const collection = await collectionRepository.findById(id, userId)
    if (!collection) {
      throw new Error('Collection not found or unauthorized')
    }

    return collectionRepository.updateCollection(id, {
      isPublic: !collection.isPublic,
    })
  }
}

export const collectionService = new CollectionService()

