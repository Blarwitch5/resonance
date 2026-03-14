import type { Format, Prisma } from '@prisma/client'
import { db } from '../lib/db'

export class ItemRepository {
  async findByUserId(userId: string, format?: Format) {
    return db.item.findMany({
      where: {
        userId,
        ...(format && { format }),
      },
      include: {
        metadata: true,
        collection: true,
      },
      orderBy: { addedAt: 'desc' },
    })
  }

  async findById(id: string, userId?: string) {
    return db.item.findFirst({
      where: {
        id,
        ...(userId && { userId }),
      },
      include: {
        metadata: true,
        collection: true,
      },
    })
  }

  async findByUserIdAndSlug(userId: string, slug: string) {
    return db.item.findFirst({
      where: {
        userId,
        slug,
      },
      include: {
        metadata: true,
        collection: true,
      },
    })
  }

  async slugExistsForUser(userId: string, slug: string, excludeItemId?: string) {
    const existing = await db.item.findFirst({
      where: {
        userId,
        slug,
        ...(excludeItemId && { id: { not: excludeItemId } }),
      },
      select: { id: true },
    })
    return !!existing
  }

  async findByCollectionId(collectionId: string) {
    return db.item.findMany({
      where: { collectionId },
      include: {
        metadata: true,
      },
      orderBy: { addedAt: 'desc' },
    })
  }

  /** Trouve un item par discogsId et userId, optionnellement filtré par collectionId (null = non classé). */
  async findByDiscogsIdAndUserId(
    discogsId: number,
    userId: string,
    collectionId?: string | null,
  ) {
    return db.item.findFirst({
      where: {
        discogsId,
        userId,
        ...(collectionId !== undefined && { collectionId }),
      },
      include: {
        metadata: true,
        collection: true,
      },
    })
  }

  async createItem(data: Prisma.ItemCreateInput) {
    return db.item.create({
      data,
      include: {
        metadata: true,
        collection: true,
      },
    })
  }

  async updateItem(id: string, data: Prisma.ItemUpdateInput) {
    return db.item.update({
      where: { id },
      data,
      include: {
        metadata: true,
        collection: true,
      },
    })
  }

  async deleteItem(id: string) {
    return db.item.delete({ where: { id } })
  }

  async getFavoritesByUserId(userId: string, format?: Format) {
    return db.item.findMany({
      where: {
        userId,
        metadata: { isFavorite: true },
        ...(format && { format }),
      },
      include: {
        metadata: true,
        collection: true,
      },
      orderBy: { addedAt: 'desc' },
    })
  }

  async getRecentItems(userId: string, limit = 10) {
    return db.item.findMany({
      where: { userId },
      include: {
        metadata: true,
        collection: true,
      },
      orderBy: { addedAt: 'desc' },
      take: limit,
    })
  }

  async getItemsByGenre(userId: string, genre: string) {
    return db.item.findMany({
      where: {
        userId,
        genre,
      },
      include: {
        metadata: true,
        collection: true,
      },
      orderBy: { addedAt: 'desc' },
    })
  }

  async countByUserId(userId: string) {
    return db.item.count({
      where: { userId },
    })
  }

  async countByFormat(userId: string) {
    const results = await db.item.groupBy({
      by: ['format'],
      where: { userId },
      _count: {
        id: true,
      },
    })

    return results.reduce(
      (acc, item) => {
        acc[item.format] = item._count.id
        return acc
      },
      {} as Record<Format, number>,
    )
  }

  async findByUserIdPaginated(
    userId: string,
    page = 1,
    perPage = 24,
    format?: Format,
    options?: {
      sort?: 'addedAt-desc' | 'addedAt-asc' | 'title-asc' | 'title-desc' | 'artist-asc' | 'artist-desc' | 'year-desc' | 'year-asc'
      genre?: string
      year?: string
      collectionId?: string
      favoritesOnly?: boolean
    },
  ) {
    const skip = (page - 1) * perPage

    // Build where clause
    const where: Prisma.ItemWhereInput = {
      userId,
      ...(format && { format }),
      ...(options?.genre && { genre: options.genre }),
      ...(options?.year && { year: Number.parseInt(options.year) }),
      // Support pour filtrer les items sans collection (collectionId = "none")
      ...(options?.collectionId === 'none' && { collectionId: null }),
      ...(options?.collectionId && options.collectionId !== 'none' && { collectionId: options.collectionId }),
      ...(options?.favoritesOnly && {
        metadata: {
          isFavorite: true,
        },
      }),
    }

    // Build orderBy clause
    let orderBy: Prisma.ItemOrderByWithRelationInput = { addedAt: 'desc' }
    if (options?.sort) {
      const [field, direction] = options.sort.split('-')
      if (field === 'addedAt') {
        orderBy = { addedAt: direction === 'asc' ? 'asc' : 'desc' }
      } else if (field === 'title') {
        orderBy = { title: direction === 'asc' ? 'asc' : 'desc' }
      } else if (field === 'artist') {
        orderBy = { artist: direction === 'asc' ? 'asc' : 'desc' }
      } else if (field === 'year') {
        orderBy = { year: direction === 'asc' ? 'asc' : 'desc' }
      }
    }

    const [items, total] = await Promise.all([
      db.item.findMany({
        where,
        include: {
          metadata: true,
          collection: true,
        },
        orderBy,
        skip,
        take: perPage,
      }),
      db.item.count({ where }),
    ])

    return {
      items,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasNext: page < Math.ceil(total / perPage),
        hasPrev: page > 1,
      },
    }
  }

  async findByCollectionIdPaginated(collectionId: string, page = 1, perPage = 24) {
    const skip = (page - 1) * perPage

    const [items, total] = await Promise.all([
      db.item.findMany({
        where: { collectionId },
        include: {
          metadata: true,
        },
        orderBy: { addedAt: 'desc' },
        skip,
        take: perPage,
      }),
      db.item.count({
        where: { collectionId },
      }),
    ])

    return {
      items,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasNext: page < Math.ceil(total / perPage),
        hasPrev: page > 1,
      },
    }
  }
}

export const itemRepository = new ItemRepository()

