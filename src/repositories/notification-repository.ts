import { db } from '../lib/db'
import type { NotificationType } from '@prisma/client'

export class NotificationRepository {
  async create(data: {
    userId: string
    type: NotificationType
    fromUserId?: string
    activityId?: string
  }) {
    return db.notification.create({ data })
  }

  /**
   * Anti-spam upsert for NEW_SHELF_ADD.
   * Groups notifications from the same follower within a 2-hour window.
   * windowStart = floor(now / 2h) * 2h — same slot for all additions in that window.
   */
  async upsertShelfAdd(userId: string, fromUserId: string) {
    const now = new Date()
    const twoHours = 2 * 60 * 60 * 1000
    const windowStart = new Date(Math.floor(now.getTime() / twoHours) * twoHours)

    await db.notification.upsert({
      where: {
        userId_fromUserId_type_windowStart: {
          userId,
          fromUserId,
          type: 'NEW_SHELF_ADD',
          windowStart,
        },
      },
      update: {
        count: { increment: 1 },
        read: false,
        createdAt: now,
      },
      create: {
        userId,
        fromUserId,
        type: 'NEW_SHELF_ADD',
        windowStart,
        count: 1,
        read: false,
      },
    })
  }

  async findByUserId(
    userId: string,
    options: { onlyUnread?: boolean; take?: number; cursor?: string } = {},
  ) {
    const { onlyUnread = false, take = 50, cursor } = options
    return db.notification.findMany({
      where: { userId, ...(onlyUnread && { read: false }) },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        fromUser: { select: { id: true, name: true, image: true, username: true } },
        activity: { select: { id: true, type: true, shelfItemId: true } },
      },
    })
  }

  async markAllRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
  }

  async markOneRead(notificationId: string, userId: string) {
    return db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    })
  }

  async countUnread(userId: string) {
    return db.notification.count({ where: { userId, read: false } })
  }
}

export const notificationRepository = new NotificationRepository()
