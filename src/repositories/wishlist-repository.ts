import { db } from '../lib/db'
import type { Format, Prisma } from '@prisma/client'

export class WishlistRepository {
  async findByUserId(userId: string, format?: Format) {
    return db.wishlist.findMany({
      where: {
        userId,
        ...(format && { format }),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })
  }

  async findById(id: string, userId?: string) {
    return db.wishlist.findFirst({
      where: {
        id,
        ...(userId && { userId }),
      },
    })
  }

  async findByDiscogsId(discogsId: number, userId: string) {
    return db.wishlist.findUnique({
      where: {
        discogsId_userId: {
          discogsId,
          userId,
        },
      },
    })
  }

  async createWishlistItem(data: Prisma.WishlistCreateInput) {
    return db.wishlist.create({ data })
  }

  async updateWishlistItem(id: string, data: Prisma.WishlistUpdateInput) {
    return db.wishlist.update({
      where: { id },
      data,
    })
  }

  async deleteWishlistItem(id: string) {
    return db.wishlist.delete({ where: { id } })
  }

  async countByUserId(userId: string) {
    return db.wishlist.count({
      where: { userId },
    })
  }

  async getRecentWishlistItems(userId: string, limit = 10) {
    return db.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /** IDs Discogs présents dans la wishlist (pour UI des cartes explorer). */
  async findDiscogsIdsByUserId(userId: string): Promise<number[]> {
    const rows = await db.wishlist.findMany({
      where: { userId },
      select: { discogsId: true },
    })
    return rows.map((row) => row.discogsId)
  }
}

export const wishlistRepository = new WishlistRepository()

