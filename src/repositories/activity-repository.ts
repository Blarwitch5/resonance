import { db } from '../lib/db'
import type { ActivityType } from '@prisma/client'

export class ActivityRepository {
  async findById(id: string) {
    return db.activity.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, imageUrl: true, username: true } },
        shelfItem: {
          include: {
            release: { select: { id: true, title: true, artist: true, coverUrl: true } },
          },
        },
      },
    })
  }

  /**
   * Cursor-based feed: returns activities from followed users, newest first.
   * Cursor is base64-encoded JSON: { createdAt: string, id: string }
   */
  async getFeedForUser(userId: string, options: { take?: number; cursor?: string } = {}) {
    const { take = 20, cursor } = options

    const follows = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    })
    const followingIds = follows.map((f) => f.followingId)

    let cursorWhere: { createdAt: Date; id: string } | undefined
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
        cursorWhere = { createdAt: new Date(decoded.createdAt), id: decoded.id }
      } catch {
        // invalid cursor — ignore
      }
    }

    const activities = await db.activity.findMany({
      where: {
        userId: { in: followingIds },
        ...(cursorWhere && {
          OR: [
            { createdAt: { lt: cursorWhere.createdAt } },
            { createdAt: cursorWhere.createdAt, id: { lt: cursorWhere.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      include: {
        user: { select: { id: true, name: true, imageUrl: true, username: true } },
        shelfItem: {
          include: {
            release: { select: { id: true, title: true, artist: true, coverUrl: true, format: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    })

    const hasMore = activities.length > take
    const items = hasMore ? activities.slice(0, take) : activities

    let nextCursor: string | null = null
    if (hasMore) {
      const last = items[items.length - 1]
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: last.createdAt.toISOString(), id: last.id }),
      ).toString('base64')
    }

    return { activities: items, nextCursor }
  }

  async toggleLike(activityId: string, userId: string) {
    const existing = await db.activityLike.findUnique({
      where: { activityId_userId: { userId, activityId } },
    })
    if (existing) {
      await db.activityLike.delete({ where: { id: existing.id } })
      return { liked: false }
    }
    await db.activityLike.create({ data: { activityId, userId } })
    return { liked: true }
  }

  async createActivity(data: {
    userId: string
    type: ActivityType
    shelfItemId?: string
    collectionId?: string
    targetUserId?: string
  }) {
    return db.activity.create({ data })
  }
}

export const activityRepository = new ActivityRepository()

export type FeedActivity = Awaited<ReturnType<ActivityRepository['getFeedForUser']>>['activities'][number]
