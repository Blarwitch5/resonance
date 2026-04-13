// src/repositories/shelf-item-repository.ts
import { db } from '../lib/db'

export class ShelfItemRepository {
  async findById(id: string, userId?: string) {
    return db.shelfItem.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
      include: { release: true, user: { select: { id: true, name: true, image: true, username: true, isPrivate: true } } },
    })
  }

  async findByIdWithRelease(id: string) {
    return db.shelfItem.findUnique({
      where: { id },
      include: {
        release: true,
        user: { select: { id: true, name: true, image: true, username: true, isPrivate: true } },
      },
    })
  }

  async findByUserAndRelease(userId: string, releaseId: string) {
    return db.shelfItem.findUnique({
      where: { userId_releaseId: { userId, releaseId } },
      include: { release: true },
    })
  }

  async findByUser(
    userId: string,
    options: {
      format?: string
      search?: string
      sort?: 'recent' | 'artist' | 'rating'
      cursor?: string
      take?: number
    } = {},
  ) {
    const { format, search, sort = 'recent', cursor, take = 24 } = options
    return db.shelfItem.findMany({
      where: {
        userId,
        release: {
          ...(format ? { format } : {}),
          ...(search
            ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { artist: { contains: search, mode: 'insensitive' } }] }
            : {}),
        },
      },
      include: { release: { select: { id: true, title: true, artist: true, coverUrl: true, format: true } } },
      orderBy:
        sort === 'artist'
          ? { release: { artist: 'asc' } }
          : sort === 'rating'
          ? { rating: 'desc' }
          : { createdAt: 'desc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take,
    })
  }

  async create(data: {
    userId: string
    releaseId: string
    condition: string
    rating?: number | null
    note?: string | null
    acquiredAt?: Date | null
  }) {
    return db.shelfItem.create({ data, include: { release: true } })
  }

  async update(id: string, userId: string, data: { condition?: string; note?: string | null; acquiredAt?: Date | null }) {
    const item = await db.shelfItem.findFirst({ where: { id, userId } })
    if (!item) throw new Error('Item not found or unauthorized')
    return db.shelfItem.update({ where: { id }, data, include: { release: true } })
  }

  async setRating(id: string, userId: string, rating: number | null) {
    const item = await db.shelfItem.findFirst({ where: { id, userId }, select: { id: true, releaseId: true } })
    if (!item) throw new Error('Item not found or unauthorized')
    await db.shelfItem.update({ where: { id }, data: { rating } })
    // Recalculate denormalized rating on Release atomically
    await db.$transaction(async (tx) => {
      const result = await tx.shelfItem.aggregate({
        where: { releaseId: item.releaseId, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      })
      await tx.release.update({
        where: { id: item.releaseId },
        data: { avgRating: result._avg.rating, ratingCount: result._count.rating },
      })
    })
  }

  async delete(id: string, userId: string) {
    const item = await db.shelfItem.findFirst({ where: { id, userId } })
    if (!item) throw new Error('Item not found or unauthorized')
    return db.shelfItem.delete({ where: { id } })
  }

  async countByUser(userId: string) {
    return db.shelfItem.count({ where: { userId } })
  }

  async getRecent(userId: string, take = 6) {
    return db.shelfItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { release: { select: { title: true, artist: true, coverUrl: true } } },
    })
  }

  async getFriendsWithRelease(currentUserId: string, releaseId: string) {
    const follows = await db.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    })
    const followingIds = follows.map((f) => f.followingId)
    return db.shelfItem.findMany({
      where: { releaseId, userId: { in: followingIds } },
      include: { user: { select: { id: true, name: true, image: true, username: true } } },
      take: 5,
    })
  }
}

export const shelfItemRepository = new ShelfItemRepository()
