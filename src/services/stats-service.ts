import { itemRepository } from '../repositories/item-repository'
import type { Format } from '@prisma/client'

export class StatsService {
  async getUserStats(userId: string) {
    const items = await itemRepository.findByUserId(userId)
    const countByFormat = await itemRepository.countByFormat(userId)

    const statsByFormat = items.reduce((acc, item) => {
      acc[item.format] = (acc[item.format] || 0) + 1
      return acc
    }, {} as Record<Format, number>)

    const favoriteCount = items.filter((item) => item.metadata?.isFavorite).length
    const listenedCount = items.filter((item) => item.metadata?.isListened).length
    const genresSet = new Set(items.map((item) => item.genre).filter(Boolean))
    const artistsSet = new Set(items.map((item) => item.artist))

    return {
      totalItems: items.length,
      vinyls: statsByFormat.VINYL || 0,
      cds: statsByFormat.CD || 0,
      cassettes: statsByFormat.CASSETTE || 0,
      favorites: favoriteCount,
      listened: listenedCount,
      genres: genresSet.size,
      artists: artistsSet.size,
    }
  }

  async getRecentItemsByGenre(userId: string, limit = 10) {
    const items = await itemRepository.findByUserId(userId)

    const byGenre = items.reduce((acc, item) => {
      if (!item.genre) return acc
      if (!acc[item.genre]) acc[item.genre] = []
      acc[item.genre].push(item)
      return acc
    }, {} as Record<string, typeof items>)

    return Object.entries(byGenre)
      .map(([genre, genreItems]) => ({
        genre,
        items: genreItems.slice(0, limit),
        count: genreItems.length,
      }))
      .sort((a, b) => b.count - a.count)
  }

  async getTopGenres(userId: string, limit = 5) {
    const genreStats = await this.getRecentItemsByGenre(userId, limit)
    return genreStats.slice(0, limit).map((stat) => stat.genre)
  }

  async getFormatDistribution(userId: string) {
    const countByFormat = await itemRepository.countByFormat(userId)
    const total = Object.values(countByFormat).reduce((sum, count) => sum + count, 0)

    return {
      vinyl: {
        count: countByFormat.VINYL || 0,
        percentage: total > 0 ? Math.round((countByFormat.VINYL / total) * 100) : 0,
      },
      cd: {
        count: countByFormat.CD || 0,
        percentage: total > 0 ? Math.round((countByFormat.CD / total) * 100) : 0,
      },
      cassette: {
        count: countByFormat.CASSETTE || 0,
        percentage: total > 0 ? Math.round((countByFormat.CASSETTE / total) * 100) : 0,
      },
    }
  }

  async getYearDistribution(userId: string) {
    const items = await itemRepository.findByUserId(userId)
    const byDecade = items.reduce((acc, item) => {
      if (!item.year) return acc
      const decade = Math.floor(item.year / 10) * 10
      acc[decade] = (acc[decade] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    return Object.entries(byDecade)
      .map(([decade, count]) => ({
        decade: Number.parseInt(decade),
        count,
      }))
      .sort((a, b) => b.decade - a.decade)
  }

  async getConditionStats(userId: string) {
    const items = await itemRepository.findByUserId(userId)
    const byCondition = items.reduce((acc, item) => {
      const condition = item.metadata?.condition || 'Unknown'
      acc[condition] = (acc[condition] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(byCondition)
      .map(([condition, count]) => ({ condition, count }))
      .sort((a, b) => b.count - a.count)
  }
}

export const statsService = new StatsService()

