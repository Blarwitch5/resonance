// src/repositories/block-repository.ts
import { db } from '../lib/db'

export class BlockRepository {
  /**
   * Block a user atomically:
   * - Deletes any follow in both directions
   * - Creates the UserBlock record
   * All in a single transaction — no intermediate state possible.
   */
  async block(blockerId: string, blockedId: string) {
    return db.$transaction([
      db.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      }),
      db.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        update: {},
        create: { blockerId, blockedId },
      }),
    ])
  }

  async unblock(blockerId: string, blockedId: string) {
    return db.userBlock.deleteMany({ where: { blockerId, blockedId } })
  }

  async isBlocking(blockerId: string, blockedId: string) {
    const block = await db.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    })
    return block !== null
  }

  /**
   * Returns true if either user has blocked the other.
   */
  async isMutuallyBlocked(userA: string, userB: string) {
    const count = await db.userBlock.count({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    })
    return count > 0
  }

  async getBlockedIds(userId: string): Promise<string[]> {
    const blocks = await db.userBlock.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    })
    return blocks.map((b) => b.blockedId)
  }

  async getBlockedByIds(userId: string): Promise<string[]> {
    const blocks = await db.userBlock.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    })
    return blocks.map((b) => b.blockerId)
  }
}

export const blockRepository = new BlockRepository()
