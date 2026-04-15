import { db } from '../lib/db'

export class ExploreRepository {
  /**
   * Top releases by shelf additions in the past 7 days.
   * Uses GROUP BY on ShelfItem.releaseId. The @@index([createdAt]) on ShelfItem
   * makes this fast — no full table scan.
   */
  async getTrending(limit = 10) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const grouped = await db.shelfItem.groupBy({
      by: ['releaseId'],
      where: { createdAt: { gte: since } },
      _count: { releaseId: true },
      orderBy: { _count: { releaseId: 'desc' } },
      take: limit,
    })

    if (grouped.length === 0) return []

    const releaseIds = grouped.map((g) => g.releaseId)
    const releases = await db.release.findMany({
      where: { id: { in: releaseIds } },
    })

    // Merge count into release objects, preserve trending order
    const releaseMap = new Map(releases.map((r) => [r.id, r]))
    return grouped
      .map((g) => {
        const release = releaseMap.get(g.releaseId)
        if (!release) return null
        return { ...release, addCount: g._count.releaseId }
      })
      .filter(Boolean)
  }

  /**
   * Users who joined recently and have at least 1 shelf item.
   * Excludes blocked users (blockerId check done at route level).
   */
  async getNewActiveMembers(excludeIds: string[] = [], limit = 8) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // last 30 days

    return db.user.findMany({
      where: {
        createdAt: { gte: since },
        id: { notIn: excludeIds },
        shelfItems: { some: {} }, // at least one item
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        imageUrl: true,
        username: true,
        createdAt: true,
        _count: { select: { shelfItems: true } },
      },
    })
  }
}

export const exploreRepository = new ExploreRepository()
