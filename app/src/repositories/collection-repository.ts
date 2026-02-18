import { db } from '../lib/db'
import type { Prisma } from '@prisma/client'

export class CollectionRepository {
  async findByUserId(userId: string) {
    return db.collection.findMany({
      where: { userId },
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  async findByUserIdWithStats(userId: string) {
    const collections = await db.collection.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            metadata: true,
          },
          orderBy: { addedAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return collections.map((collection) => {
      // Générer automatiquement la cover à partir du premier album avec cover
      const firstItemWithCover = collection.items.find((item) => item.coverUrl && item.coverUrl.trim() !== '')
      const existingCover = collection.coverImage && collection.coverImage.trim() !== '' ? collection.coverImage : null
      const generatedCover = existingCover || firstItemWithCover?.coverUrl || null

      return {
        ...collection,
        coverImage: generatedCover,
        itemCount: collection.items.length,
        vinylCount: collection.items.filter((item) => item.format === 'VINYL').length,
        cdCount: collection.items.filter((item) => item.format === 'CD').length,
        cassetteCount: collection.items.filter((item) => item.format === 'CASSETTE').length,
        favoriteCount: collection.items.filter((item) => item.metadata?.isFavorite).length,
      }
    })
  }

  async findById(id: string, userId?: string) {
    return db.collection.findFirst({
      where: {
        id,
        ...(userId && { userId }),
      },
      include: {
        items: {
          include: {
            metadata: true,
          },
          orderBy: { addedAt: 'desc' },
        },
        _count: {
          select: { items: true },
        },
      },
    })
  }

  async findBySlug(slug: string, userId: string) {
    const collection = await db.collection.findUnique({
      where: {
        userId_slug: {
          userId,
          slug,
        },
      },
      include: {
        items: {
          include: {
            metadata: true,
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    })

    if (!collection) return null

    // Générer automatiquement la cover à partir du premier album avec cover
    const firstItemWithCover = collection.items.find((item) => item.coverUrl && item.coverUrl.trim() !== '')
    const existingCover = collection.coverImage && collection.coverImage.trim() !== '' ? collection.coverImage : null
    const generatedCover = existingCover || firstItemWithCover?.coverUrl || null

    return {
      ...collection,
      coverImage: generatedCover,
    }
  }

  async createCollection(data: Prisma.CollectionCreateInput) {
    return db.collection.create({
      data,
      include: {
        _count: {
          select: { items: true },
        },
      },
    })
  }

  async updateCollection(id: string, data: Prisma.CollectionUpdateInput) {
    return db.collection.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            metadata: true,
          },
        },
        _count: {
          select: { items: true },
        },
      },
    })
  }

  async deleteCollection(id: string) {
    return db.collection.delete({ where: { id } })
  }

  async countByUserId(userId: string) {
    return db.collection.count({
      where: { userId },
    })
  }

  async getRecentCollections(userId: string, limit = 5) {
    const collections = await db.collection.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            metadata: true,
          },
          take: 6,
          orderBy: { addedAt: 'desc' },
        },
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    return collections.map((collection) => {
      // Générer automatiquement la cover à partir du premier album avec cover
      const firstItemWithCover = collection.items.find((item) => item.coverUrl && item.coverUrl.trim() !== '')
      const existingCover = collection.coverImage && collection.coverImage.trim() !== '' ? collection.coverImage : null
      const generatedCover = existingCover || firstItemWithCover?.coverUrl || null

      return {
        ...collection,
        coverImage: generatedCover,
      }
    })
  }
}

export const collectionRepository = new CollectionRepository()

