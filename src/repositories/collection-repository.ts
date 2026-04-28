import { db } from '../lib/db'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export class CollectionRepository {
  private async slugExists(userId: string, slug: string): Promise<boolean> {
    const found = await db.collection.findUnique({
      where: { userId_slug: { userId, slug } },
    })
    return found !== null
  }

  private async generateSlug(title: string, userId: string): Promise<string> {
    const base = slugify(title)
    if (!base) throw new Error('Title produces empty slug')
    if (!(await this.slugExists(userId, base))) return base
    for (let i = 2; i <= 100; i++) {
      const candidate = `${base}-${i}`
      if (!(await this.slugExists(userId, candidate))) return candidate
    }
    return `${base}-${Date.now()}`
  }

  async createWithSlug(data: {
    userId: string
    name: string
    description?: string
    isPublic?: boolean
  }) {
    const slug = await this.generateSlug(data.name, data.userId)
    return db.collection.create({
      data: {
        userId: data.userId,
        name: data.name,
        slug,
        description: data.description,
        isPublic: data.isPublic ?? true,
      },
    })
  }

  async findByUser(userId: string) {
    return db.collection.findMany({
      where: { userId },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      include: { _count: { select: { items: true } } },
    })
  }

  async findById(id: string, userId?: string) {
    return db.collection.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
      include: { items: { include: { shelfItem: { include: { release: true } } } } },
    })
  }

  async findBySlug(userId: string, slug: string) {
    return db.collection.findUnique({
      where: { userId_slug: { userId, slug } },
      include: {
        items: {
          include: {
            shelfItem: {
              include: {
                release: { select: { id: true, title: true, artist: true, coverUrl: true, format: true } },
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    })
  }

  async getPinned(userId: string) {
    return db.collection.findMany({
      where: { userId, isPinned: true },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { items: true } } },
    })
  }

  async togglePin(collectionId: string, userId: string): Promise<{ isPinned: boolean }> {
    const collection = await db.collection.findFirst({ where: { id: collectionId, userId } })
    if (!collection) throw new Error('Collection not found')

    if (collection.isPinned) {
      await db.collection.update({ where: { id: collectionId }, data: { isPinned: false } })
      return { isPinned: false }
    }

    const pinnedCount = await db.collection.count({ where: { userId, isPinned: true } })
    if (pinnedCount >= 4) throw new Error('MAX_PINNED')

    await db.collection.update({ where: { id: collectionId }, data: { isPinned: true } })
    return { isPinned: true }
  }

  async update(id: string, userId: string, data: { name?: string; description?: string; isPublic?: boolean }) {
    const collection = await db.collection.findFirst({ where: { id, userId } })
    if (!collection) throw new Error('Collection not found')
    return db.collection.update({ where: { id }, data })
  }

  async delete(id: string, userId: string) {
    const collection = await db.collection.findFirst({ where: { id, userId } })
    if (!collection) throw new Error('Collection not found')
    return db.collection.delete({ where: { id } })
  }

  async addItem(collectionId: string, shelfItemId: string, userId: string) {
    const collection = await db.collection.findFirst({ where: { id: collectionId, userId } })
    if (!collection) throw new Error('Collection not found')
    return db.collectionItem.upsert({
      where: { collectionId_shelfItemId: { collectionId, shelfItemId } },
      update: {},
      create: { collectionId, shelfItemId },
    })
  }

  async removeItem(collectionId: string, shelfItemId: string, userId: string) {
    const collection = await db.collection.findFirst({ where: { id: collectionId, userId } })
    if (!collection) throw new Error('Collection not found')
    return db.collectionItem.deleteMany({ where: { collectionId, shelfItemId } })
  }
}

export const collectionRepository = new CollectionRepository()
