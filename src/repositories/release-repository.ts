// src/repositories/release-repository.ts
import { db } from '../lib/db'

export class ReleaseRepository {
  async upsertFromDiscogs(data: {
    discogsId: string
    title: string
    artist: string
    label?: string | null
    year?: number | null
    country?: string | null
    format: string
    coverUrl?: string | null
    tracklist?: object | null
  }) {
    return db.release.upsert({
      where: { discogsId: data.discogsId },
      create: data,
      update: {
        title: data.title,
        artist: data.artist,
        label: data.label,
        year: data.year,
        country: data.country,
        coverUrl: data.coverUrl,
        tracklist: data.tracklist ?? undefined,
      },
    })
  }

  async findByDiscogsId(discogsId: string) {
    return db.release.findUnique({
      where: { discogsId },
      include: {
        _count: { select: { shelfItems: true, wants: true } },
      },
    })
  }

  async findById(id: string) {
    return db.release.findUnique({
      where: { id },
      include: {
        _count: { select: { shelfItems: true, wants: true } },
      },
    })
  }

  async recalculateRating(releaseId: string) {
    const result = await db.shelfItem.aggregate({
      where: { releaseId, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    })
    return db.release.update({
      where: { id: releaseId },
      data: {
        avgRating: result._avg.rating,
        ratingCount: result._count.rating,
      },
    })
  }

  async addRating(releaseId: string, rating: number) {
    await db.$transaction(async (tx) => {
      const release = await tx.release.findUnique({
        where: { id: releaseId },
        select: { avgRating: true, ratingCount: true },
      })
      if (!release) return
      const oldCount = release.ratingCount
      const oldAvg = release.avgRating ?? 0
      const newCount = oldCount + 1
      const newAvg = (oldAvg * oldCount + rating) / newCount
      await tx.release.update({
        where: { id: releaseId },
        data: { avgRating: newAvg, ratingCount: newCount },
      })
    })
  }

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
    const releases = await db.release.findMany({ where: { id: { in: releaseIds } } })
    const releaseMap = new Map(releases.map((r) => [r.id, r]))
    return grouped
      .map((g) => {
        const release = releaseMap.get(g.releaseId)
        if (!release) return null
        return { ...release, addCount: g._count.releaseId }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
  }

  async findOrCreateFromDiscogs(discogsId: string) {
    const existing = await db.release.findUnique({ where: { discogsId } })

    // Only skip the Discogs API call if all essential fields are already populated
    if (existing && existing.coverUrl && existing.tracklist && existing.label !== null && existing.year !== null) {
      return existing
    }

    const DISCOGS_TOKEN = import.meta.env.DISCOGS_TOKEN
    const headers: HeadersInit = { 'User-Agent': 'Resonance/1.0' }
    if (DISCOGS_TOKEN) headers['Authorization'] = `Discogs token=${DISCOGS_TOKEN}`

    const res = await fetch(`https://api.discogs.com/releases/${discogsId}`, { headers })
    if (!res.ok) return existing ?? null

    const data = await res.json()
    const coverUrl: string | null = data.images?.[0]?.uri ?? null
    const format = this.resolveFormat(data.formats ?? [])
    const tracklist =
      data.tracklist?.map((t: { position: string; title: string; duration: string }) => ({
        position: t.position,
        title: t.title,
        duration: t.duration,
      })) ?? null

    // Always upsert with full data to backfill any missing fields
    return db.release.upsert({
      where: { discogsId },
      create: {
        discogsId,
        title: data.title ?? 'Unknown',
        artist: data.artists?.[0]?.name ?? 'Unknown',
        label: data.labels?.[0]?.name ?? null,
        year: data.year ?? null,
        country: data.country ?? null,
        format,
        coverUrl,
        tracklist,
      },
      update: {
        title: data.title ?? 'Unknown',
        artist: data.artists?.[0]?.name ?? 'Unknown',
        label: data.labels?.[0]?.name ?? null,
        year: data.year ?? null,
        country: data.country ?? null,
        coverUrl,
        tracklist,
      },
    })
  }

  private resolveFormat(formats: Array<{ name: string }>): string {
    const names = formats.map((f) => f.name.toLowerCase())
    if (names.includes('vinyl')) return 'Vinyl'
    if (names.includes('cd')) return 'CD'
    if (names.some((n) => n.includes('cassette'))) return 'Cassette'
    return 'Vinyl'
  }
}

export const releaseRepository = new ReleaseRepository()
