import type { Prisma } from '@prisma/client'
import { db } from '../lib/db'

type SortOption =
  | 'ownedAt-desc'
  | 'ownedAt-asc'
  | 'albumTitle-asc'
  | 'albumTitle-desc'
  | 'artistName-asc'
  | 'artistName-desc'
  | 'year-desc'
  | 'year-asc'
  | 'rating-desc'

type FindOptions = {
  format?: string
  sort?: SortOption
  search?: string
}

function buildOrderBy(sort?: SortOption): Prisma.ItemOrderByWithRelationInput {
  if (!sort) return { ownedAt: 'desc' }
  const [field, sortDirection] = sort.split('-') as [string, 'asc' | 'desc']
  const direction = sortDirection === 'asc' ? 'asc' : 'desc'
  if (field === 'ownedAt') return { ownedAt: direction }
  if (field === 'albumTitle') return { albumTitle: direction }
  if (field === 'artistName') return { artistName: direction }
  if (field === 'year') return { year: direction }
  if (field === 'rating') return { rating: direction }
  return { ownedAt: 'desc' }
}

function buildWhere(userId: string, options?: FindOptions): Prisma.ItemWhereInput {
  return {
    userId,
    ...(options?.format && { format: options.format }),
    ...(options?.search && {
      OR: [
        { albumTitle: { contains: options.search, mode: 'insensitive' } },
        { artistName: { contains: options.search, mode: 'insensitive' } },
      ],
    }),
  }
}

export class ItemRepository {
  async findByUserIdPaginated(
    userId: string,
    page = 1,
    perPage = 48,
    options?: FindOptions,
  ) {
    const skip = (page - 1) * perPage
    const where = buildWhere(userId, options)
    const orderBy = buildOrderBy(options?.sort)

    const [items, total] = await Promise.all([
      db.item.findMany({ where, orderBy, skip, take: perPage }),
      db.item.count({ where }),
    ])

    return {
      items,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasNext: page < Math.ceil(total / perPage),
        hasPrev: page > 1,
      },
    }
  }

  async countByFormat(userId: string): Promise<Record<string, number>> {
    const results = await db.item.groupBy({
      by: ['format'],
      where: { userId },
      _count: { id: true },
    })
    return Object.fromEntries(results.map((result) => [result.format, result._count.id]))
  }

  async findById(id: string, userId?: string) {
    return db.item.findFirst({
      where: { id, ...(userId && { userId }) },
    })
  }

  async slugExistsForUser(userId: string, slug: string) {
    const existing = await db.item.findFirst({ where: { userId, slug }, select: { id: true } })
    return !!existing
  }

  async findBySlug(userId: string, slug: string) {
    return db.item.findFirst({ where: { userId, slug } })
  }

  async findByDiscogsReleaseId(userId: string, discogsReleaseId: string) {
    return db.item.findFirst({ where: { userId, discogsReleaseId } })
  }

  async create(data: Prisma.ItemCreateInput) {
    return db.item.create({ data })
  }

  async update(id: string, data: Prisma.ItemUpdateInput) {
    return db.item.update({ where: { id }, data })
  }

  async delete(id: string) {
    return db.item.delete({ where: { id } })
  }

  async countByUserId(userId: string) {
    return db.item.count({ where: { userId } })
  }
}

export const itemRepository = new ItemRepository()
