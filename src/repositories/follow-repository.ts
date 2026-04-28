import { db } from '../lib/db'

export class FollowRepository {
  async follow(followerId: string, followingId: string) {
    return db.follow.create({
      data: { followerId, followingId },
    })
  }

  async unfollow(followerId: string, followingId: string) {
    return db.follow.deleteMany({
      where: { followerId, followingId },
    })
  }

  async isFollowing(followerId: string, followingId: string) {
    const follow = await db.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { id: true },
    })
    return !!follow
  }

  async getFollowers(userId: string) {
    return db.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: { id: true, username: true, name: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getFollowing(userId: string) {
    return db.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: { id: true, username: true, name: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}

export const followRepository = new FollowRepository()
