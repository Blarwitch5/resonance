import { db } from '../lib/db'

export class WishlistRepository {
  async findByUserId(userId: string, format?: string) {
    return db.wishlistItem.findMany({
      where: { userId, ...(format && { format }) },
      orderBy: { addedAt: 'desc' },
    })
  }

  async findByDiscogsReleaseId(userId: string, discogsReleaseId: string) {
    return db.wishlistItem.findUnique({
      where: { userId_discogsReleaseId: { userId, discogsReleaseId } },
    })
  }

  async create(data: {
    userId: string
    discogsReleaseId: string
    artistName: string
    albumTitle: string
    format: string
    coverUrl?: string | null
    discogsUrl?: string | null
    year?: number | null
    label?: string | null
  }) {
    return db.wishlistItem.create({
      data: {
        user: { connect: { id: data.userId } },
        discogsReleaseId: data.discogsReleaseId,
        artistName: data.artistName,
        albumTitle: data.albumTitle,
        format: data.format,
        coverUrl: data.coverUrl ?? null,
        discogsUrl: data.discogsUrl ?? null,
        year: data.year ?? null,
        label: data.label ?? null,
      },
    })
  }

  async delete(wishlistItemId: string, userId: string) {
    return db.wishlistItem.deleteMany({
      where: { id: wishlistItemId, userId },
    })
  }

  async deleteByDiscogsReleaseId(userId: string, discogsReleaseId: string) {
    return db.wishlistItem.deleteMany({
      where: { userId, discogsReleaseId },
    })
  }

  async countByUserId(userId: string) {
    return db.wishlistItem.count({ where: { userId } })
  }
}

export const wishlistRepository = new WishlistRepository()
