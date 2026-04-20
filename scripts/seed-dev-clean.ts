/**
 * Removes all seed-dev data (users with @seed.local emails + their associated records).
 * Usage: pnpm seed:dev:clean
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function clean() {
  console.log('🗑️   seed-dev:clean — removing seed data…')

  const users = await db.user.findMany({
    where: { email: { endsWith: '@seed.local' } },
    select: { id: true, username: true },
  })

  if (!users.length) {
    console.log('   nothing to clean.')
    return
  }

  const ids = users.map((u) => u.id)

  // Cascade handled by FK onDelete, but activities/follows need explicit removal
  await db.activity.deleteMany({ where: { userId: { in: ids } } })
  await db.follow.deleteMany({ where: { OR: [{ followerId: { in: ids } }, { followingId: { in: ids } }] } })
  await db.shelfItem.deleteMany({ where: { userId: { in: ids } } })
  await db.release.deleteMany({ where: { discogsId: { startsWith: 'seed-' } } })
  await db.user.deleteMany({ where: { id: { in: ids } } })

  console.log(`   ✓ removed ${users.length} seed users and their data`)
  console.log('   Seed releases cleaned.')
}

clean()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
