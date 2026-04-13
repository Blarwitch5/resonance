// src/repositories/want-repository.ts
import { db } from '../lib/db'

export class WantRepository {
  async create(userId: string, releaseId: string, priority: 'high' | 'normal' = 'normal') {
    return db.want.upsert({
      where: { userId_releaseId: { userId, releaseId } },
      update: { priority },
      create: { userId, releaseId, priority },
      include: { release: { select: { id: true, title: true, artist: true, coverUrl: true, format: true, year: true } } },
    })
  }

  async delete(id: string, userId: string) {
    return db.want.deleteMany({ where: { id, userId } })
  }

  async deleteByRelease(userId: string, releaseId: string) {
    return db.want.deleteMany({ where: { userId, releaseId } })
  }

  async findByUser(userId: string) {
    return db.want.findMany({
      where: { userId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { release: { select: { id: true, title: true, artist: true, coverUrl: true, format: true, year: true } } },
    })
  }

  async findByUserAndRelease(userId: string, releaseId: string) {
    return db.want.findUnique({
      where: { userId_releaseId: { userId, releaseId } },
    })
  }

  async countByUser(userId: string) {
    return db.want.count({ where: { userId } })
  }
}

export const wantRepository = new WantRepository()
