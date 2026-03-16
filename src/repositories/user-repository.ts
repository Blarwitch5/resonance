import { db } from '../lib/db'
import type { Prisma } from '@prisma/client'

export class UserRepository {
  async findById(id: string) {
    return db.user.findUnique({
      where: { id },
      include: {
        collections: {
          include: {
            _count: {
              select: { items: true },
            },
          },
        },
        _count: {
          select: {
            items: true,
            collections: true,
            wishlist: true,
          },
        },
      },
    })
  }

  async findByEmail(email: string) {
    return db.user.findUnique({
      where: { email },
    })
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return db.user.update({
      where: { id },
      data,
    })
  }

  async getUserStats(userId: string) {
    const [items, collections, wishlist] = await Promise.all([
      db.item.count({ where: { userId } }),
      db.collection.count({ where: { userId } }),
      db.wishlist.count({ where: { userId } }),
    ])

    return {
      totalItems: items,
      totalCollections: collections,
      totalWishlist: wishlist,
    }
  }

  async getRecentActivity(userId: string, limit = 20) {
    // Récupérer les activités récentes : items ajoutés, collections créées, wishlist ajoutés
    const [recentItems, recentCollections, recentWishlist, recentFavorites] = await Promise.all([
      // Items ajoutés récemment
      db.item.findMany({
        where: { userId },
        include: {
          collection: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          metadata: {
            select: {
              isFavorite: true,
            },
          },
        },
        orderBy: { addedAt: 'desc' },
        take: limit,
      }),
      // Collections créées récemment
      db.collection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      // Wishlist ajoutés récemment
      db.wishlist.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      // Items marqués comme favoris récemment (via metadata.updatedAt)
      db.item.findMany({
        where: {
          userId,
          metadata: {
            isFavorite: true,
          },
        },
        include: {
          metadata: {
            select: {
              isFavorite: true,
              updatedAt: true,
            },
          },
          collection: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        take: limit * 2, // Prendre plus pour pouvoir filtrer et trier
      }),
    ])

    // Combiner et trier toutes les activités par date
    type Activity = {
      type: 'item_added' | 'collection_created' | 'wishlist_added' | 'item_favorited'
      date: Date
      data: unknown
    }

    const activities: Activity[] = []

    // Items ajoutés
    recentItems.forEach((item) => {
      activities.push({
        type: 'item_added',
        date: item.addedAt,
        data: item,
      })
    })

    // Collections créées
    recentCollections.forEach((collection) => {
      activities.push({
        type: 'collection_created',
        date: collection.createdAt,
        data: collection,
      })
    })

    // Wishlist ajoutés
    recentWishlist.forEach((wish) => {
      activities.push({
        type: 'wishlist_added',
        date: wish.createdAt,
        data: wish,
      })
    })

    // Items favoris (seulement ceux qui ont été mis à jour récemment)
    // Trier par updatedAt décroissant et prendre seulement ceux récemment mis à jour
    const sortedFavorites = recentFavorites
      .filter((item) => item.metadata?.isFavorite && item.metadata.updatedAt)
      .sort((a, b) => {
        const dateA = a.metadata?.updatedAt?.getTime() || 0
        const dateB = b.metadata?.updatedAt?.getTime() || 0
        return dateB - dateA
      })
      .slice(0, limit)

    sortedFavorites.forEach((item) => {
      if (item.metadata?.updatedAt) {
        activities.push({
          type: 'item_favorited',
          date: item.metadata.updatedAt,
          data: item,
        })
      }
    })

    // Trier par date décroissante et limiter
    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit)
  }
}

export const userRepository = new UserRepository()

