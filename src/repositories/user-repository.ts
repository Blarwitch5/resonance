import { db } from '../lib/db'
import type { Prisma } from '@prisma/client'

export class UserRepository {
  async findById(userId: string) {
    return db.user.findUnique({ where: { id: userId } })
  }

  async findByUsername(username: string) {
    return db.user.findUnique({ where: { username } })
  }

  async findByEmail(email: string) {
    return db.user.findUnique({ where: { email } })
  }

  async updateUser(userId: string, data: Prisma.UserUpdateInput) {
    return db.user.update({ where: { id: userId }, data })
  }

  async getProfileStats(userId: string) {
    const [
      totalItems,
      totalLists,
      totalWishlistItems,
      followerCount,
      followingCount,
      formatCounts,
      ratingAggregate,
    ] = await Promise.all([
      db.item.count({ where: { userId } }),
      db.list.count({ where: { userId } }),
      db.wishlistItem.count({ where: { userId } }),
      db.follow.count({ where: { followingId: userId } }),
      db.follow.count({ where: { followerId: userId } }),
      db.item.groupBy({
        by: ['format'],
        where: { userId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      db.item.aggregate({
        where: { userId, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ])

    const dominantFormat = formatCounts[0]
      ? {
          name: formatCounts[0].format,
          count: formatCounts[0]._count.id,
          percentage: Math.round((formatCounts[0]._count.id / totalItems) * 100),
        }
      : null

    return {
      totalItems,
      totalLists,
      totalWishlistItems,
      followerCount,
      followingCount,
      dominantFormat,
      averageRating: ratingAggregate._avg.rating
        ? Math.round(ratingAggregate._avg.rating * 10) / 10
        : null,
      ratedCount: ratingAggregate._count.rating,
    }
  }

  async isFollowing(followerId: string, followingId: string) {
    const follow = await db.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { id: true },
    })
    return !!follow
  }

  async countWants(userId: string) {
    return db.want.count({ where: { userId } })
  }
}

export const userRepository = new UserRepository()
