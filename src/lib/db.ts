import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: import.meta.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

// Initialisation lazy pour éviter les erreurs au démarrage
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient()
}

export const db = globalForPrisma.prisma

