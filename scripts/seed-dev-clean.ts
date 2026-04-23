/**
 * Removes all seed-dev data (users with @seed.local emails + their associated records).
 * Usage: pnpm seed:dev:clean
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Real Discogs IDs used by the seed script — kept in sync with seed-dev.ts
const SEED_DISCOGS_IDS = [
  '2825456',  // Abbey Road / The Beatles
  '14186441', // Dark Side of the Moon / Pink Floyd
  '9287809',  // Kind of Blue / Miles Davis
  '7097051',  // Nevermind / Nirvana
  '4950798',  // OK Computer / Radiohead
  '219517',   // Illmatic / Nas
  '4570366',  // Random Access Memories / Daft Punk
  '8067003',  // Blue Train / John Coltrane
  '7252111',  // Currents / Tame Impala
  '5006908',  // Music Has the Right to Children / Boards of Canada
  '2911293',  // Thriller / Michael Jackson
  '194021',   // Purple Rain / Prince
  '4887177',  // Selected Ambient Works 85-92 / Aphex Twin
  '1174296',  // In Rainbows / Radiohead
  '526351',   // Rumours / Fleetwood Mac
]

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

  // Remove old-format fake releases (legacy seed data with 'seed-' prefix IDs)
  await db.release.deleteMany({ where: { discogsId: { startsWith: 'seed-' } } })

  // Remove real-ID seed releases that have no remaining shelf items
  // (real user items referencing these releases are preserved)
  const orphanedSeedReleases = await db.release.findMany({
    where: {
      discogsId: { in: SEED_DISCOGS_IDS },
      shelfItems: { none: {} },
    },
    select: { id: true, title: true },
  })
  if (orphanedSeedReleases.length > 0) {
    await db.release.deleteMany({
      where: { id: { in: orphanedSeedReleases.map((r) => r.id) } },
    })
    console.log(`   ✓ removed ${orphanedSeedReleases.length} orphaned seed releases`)
  }

  await db.user.deleteMany({ where: { id: { in: ids } } })

  console.log(`   ✓ removed ${users.length} seed users and their data`)
}

clean()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
