/**
 * Seed script for local development.
 * Creates 10 fictive users with shelf items and follows so that
 * /api/explore/trending and /api/explore/new-members return real data.
 *
 * Usage: pnpm seed:dev
 *
 * Safe to run multiple times — skips existing records.
 * Does NOT create accounts/passwords (seed users are DB-only, not loginable).
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// ── Data ──────────────────────────────────────────────────────────────────────

const SEED_USERS = [
  { username: 'vinyl_junkie', name: 'Marc Legrand', email: 'marc@seed.local' },
  { username: 'crate_digger', name: 'Sophie Leroux', email: 'sophie@seed.local' },
  { username: 'jazzhound', name: 'Thomas Dupont', email: 'thomas@seed.local' },
  { username: 'cassette_kid', name: 'Lucie Bernard', email: 'lucie@seed.local' },
  { username: 'krautrock_fan', name: 'Pierre Martin', email: 'pierre@seed.local' },
  { username: 'disco_queen', name: 'Camille Petit', email: 'camille@seed.local' },
  { username: 'shoegaze_lord', name: 'Alex Moreau', email: 'alex@seed.local' },
  { username: 'folk_librarian', name: 'Emma Rousseau', email: 'emma@seed.local' },
  { username: 'beat_maker99', name: 'Nicolas Simon', email: 'nicolas@seed.local' },
  { username: 'postpunk_archivist', name: 'Julie Laurent', email: 'julie@seed.local' },
]

const SEED_RELEASES = [
  { discogsId: 'seed-1001', title: 'Abbey Road', artist: 'The Beatles', format: 'Vinyl', year: 1969 },
  { discogsId: 'seed-1002', title: 'Dark Side of the Moon', artist: 'Pink Floyd', format: 'Vinyl', year: 1973 },
  { discogsId: 'seed-1003', title: 'Kind of Blue', artist: 'Miles Davis', format: 'Vinyl', year: 1959 },
  { discogsId: 'seed-1004', title: 'Nevermind', artist: 'Nirvana', format: 'CD', year: 1991 },
  { discogsId: 'seed-1005', title: 'OK Computer', artist: 'Radiohead', format: 'CD', year: 1997 },
  { discogsId: 'seed-1006', title: 'Illmatic', artist: 'Nas', format: 'Cassette', year: 1994 },
  { discogsId: 'seed-1007', title: 'Random Access Memories', artist: 'Daft Punk', format: 'CD', year: 2013 },
  { discogsId: 'seed-1008', title: 'Blue Train', artist: 'John Coltrane', format: 'Vinyl', year: 1957 },
  { discogsId: 'seed-1009', title: 'Currents', artist: 'Tame Impala', format: 'Vinyl', year: 2015 },
  { discogsId: 'seed-1010', title: 'Music Has the Right to Children', artist: 'Boards of Canada', format: 'CD', year: 1998 },
  { discogsId: 'seed-1011', title: 'Thriller', artist: 'Michael Jackson', format: 'Vinyl', year: 1982 },
  { discogsId: 'seed-1012', title: 'Purple Rain', artist: 'Prince', format: 'Vinyl', year: 1984 },
  { discogsId: 'seed-1013', title: 'Selected Ambient Works 85-92', artist: 'Aphex Twin', format: 'Cassette', year: 1992 },
  { discogsId: 'seed-1014', title: 'In Rainbows', artist: 'Radiohead', format: 'Vinyl', year: 2007 },
  { discogsId: 'seed-1015', title: 'Rumours', artist: 'Fleetwood Mac', format: 'Vinyl', year: 1977 },
]

const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G+']

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function sample<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedDev() {
  console.log('🌱  seed-dev — starting\n')

  // 1. Users
  console.log('👤  Upserting users…')
  const createdUsers = []
  for (const u of SEED_USERS) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        username: u.username,
        name: u.name,
        emailVerified: true,
        onboardingCompleted: true,
      },
    })
    createdUsers.push(user)
    console.log(`   ✓ @${user.username} (${user.id})`)
  }

  // 2. Releases
  console.log('\n💿  Upserting releases…')
  const createdReleases = []
  for (const r of SEED_RELEASES) {
    const release = await db.release.upsert({
      where: { discogsId: r.discogsId },
      update: {},
      create: {
        discogsId: r.discogsId,
        title: r.title,
        artist: r.artist,
        format: r.format,
        year: r.year,
      },
    })
    createdReleases.push(release)
  }
  console.log(`   ✓ ${createdReleases.length} releases ready`)

  // 3. ShelfItems — each user gets 3-8 random releases
  console.log('\n📦  Creating shelf items…')
  let shelfCount = 0
  for (const user of createdUsers) {
    const releases = sample(createdReleases, Math.floor(Math.random() * 6) + 3)
    for (const release of releases) {
      const existing = await db.shelfItem.findUnique({
        where: { userId_releaseId: { userId: user.id, releaseId: release.id } },
      })
      if (existing) continue
      await db.shelfItem.create({
        data: {
          userId: user.id,
          releaseId: release.id,
          condition: pick(CONDITIONS),
          rating: Math.random() > 0.4 ? Math.floor(Math.random() * 5) + 1 : null,
        },
      })
      shelfCount++
    }
  }
  console.log(`   ✓ ${shelfCount} shelf items created`)

  // 4. Follows — sparse social graph so feed/explore work
  console.log('\n🤝  Creating follows…')
  let followCount = 0
  for (const follower of createdUsers) {
    const targets = sample(
      createdUsers.filter((u) => u.id !== follower.id),
      Math.floor(Math.random() * 4) + 1,
    )
    for (const following of targets) {
      const existing = await db.follow.findUnique({
        where: { followerId_followingId: { followerId: follower.id, followingId: following.id } },
      })
      if (existing) continue
      await db.follow.create({
        data: { followerId: follower.id, followingId: following.id },
      })
      followCount++
    }
  }
  console.log(`   ✓ ${followCount} follows created`)

  // 5. Activities — ADD_ITEM for each shelf item (for trending)
  console.log('\n📣  Creating activities…')
  const allShelfItems = await db.shelfItem.findMany({
    where: { userId: { in: createdUsers.map((u) => u.id) } },
  })
  let activityCount = 0
  for (const item of allShelfItems) {
    const existing = await db.activity.findFirst({
      where: { userId: item.userId, shelfItemId: item.id, type: 'ADD_ITEM' },
    })
    if (existing) continue
    await db.activity.create({
      data: {
        userId: item.userId,
        shelfItemId: item.id,
        type: 'ADD_ITEM',
      },
    })
    activityCount++
  }
  console.log(`   ✓ ${activityCount} activities created`)

  console.log('\n✅  seed-dev complete!')
  console.log(`   Users: ${createdUsers.length}`)
  console.log(`   Releases: ${createdReleases.length}`)
  console.log(`   Shelf items: ${shelfCount}`)
  console.log(`   Follows: ${followCount}`)
  console.log(`   Activities: ${activityCount}`)
  console.log('\nAll seed users use email @seed.local — they have no accounts/passwords.')
  console.log('To remove seed data: pnpm seed:dev:clean\n')
}

seedDev()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
