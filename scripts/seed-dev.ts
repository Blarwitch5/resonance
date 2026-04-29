/**
 * Seed script for local development.
 * Creates 10 fictive users with shelf items and follows so that
 * /api/explore/trending and /api/explore/new-members return real data.
 *
 * Fetches real metadata (tracklist, label, country) from the Discogs API
 * so that item detail pages display complete information.
 * Set DISCOGS_TOKEN in your .env file to avoid rate limiting.
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

// Real Discogs release IDs — decoded from cover image URLs
const SEED_RELEASES = [
  { discogsId: '2825456', title: 'Abbey Road', artist: 'The Beatles', format: 'Vinyl', year: 1969, coverUrl: 'https://i.discogs.com/uctih8PnXxwdSrPfzXP-ZwRTxxhVs_8G2DgDhqQBJaY/rs:fit/g:sm/q:90/h:608/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI4MjU0/NTYtMTQzMDc3MDE0/My0xMDU3LmpwZWc.jpeg' },
  { discogsId: '14186441', title: 'Dark Side of the Moon', artist: 'Pink Floyd', format: 'Vinyl', year: 1973, coverUrl: 'https://i.discogs.com/Tq4RLJXx26PDGwUs7f_x2MrkQD2wn3e7XAaUkWnAvA4/rs:fit/g:sm/q:90/h:607/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTE0MTg2/NDQxLTE1Njk0ODcx/NjEtNzMxNC5qcGVn.jpeg' },
  { discogsId: '9287809', title: 'Kind of Blue', artist: 'Miles Davis', format: 'Vinyl', year: 1959, coverUrl: 'https://i.discogs.com/1fwskTLM6cfxbdNmBDJ8expl6wab0tEgxvuloLIqKh8/rs:fit/g:sm/q:90/h:596/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTkyODc4/MDktMTQ3OTc1MzIz/Ni05NjE3LmpwZWc.jpeg' },
  { discogsId: '7097051', title: 'Nevermind', artist: 'Nirvana', format: 'CD', year: 1991, coverUrl: 'https://i.discogs.com/uCeQtLv9OSNjC5_AjarCojZNepI9vqcnYeqsImnzXyg/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTcwOTcw/NTEtMTU1NjQ0NDE4/MC03NTA1LmpwZWc.jpeg' },
  { discogsId: '4950798', title: 'OK Computer', artist: 'Radiohead', format: 'CD', year: 1997, coverUrl: 'https://i.discogs.com/F_KSyKjGi2YN5SBttMhdgP2zyNdmHv7HHWvDVGj3Shg/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTQ5NTA3/OTgtMTM4ODYyMzYx/MS0yMzYyLmpwZWc.jpeg' },
  { discogsId: '219517', title: 'Illmatic', artist: 'Nas', format: 'Cassette', year: 1994, coverUrl: 'https://i.discogs.com/URbHPCy0MCWHRZDgwx_sC3iOz_9DPt9JQNwlCiBvSG8/rs:fit/g:sm/q:90/h:597/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTIxOTUx/Ny0xMzk2Mjg0MzQ2/LTczODIuanBlZw.jpeg' },
  { discogsId: '4570366', title: 'Random Access Memories', artist: 'Daft Punk', format: 'CD', year: 2013, coverUrl: 'https://i.discogs.com/IR6_z_1KUErO-OORqXG2_MJhqWxsaPxYRi-hOLLdHic/rs:fit/g:sm/q:90/h:592/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTQ1NzAz/NjYtMTc0OTM3MjMx/Ny0xODg1LmpwZWc.jpeg' },
  { discogsId: '8067003', title: 'Blue Train', artist: 'John Coltrane', format: 'Vinyl', year: 1957, coverUrl: 'https://i.discogs.com/ebbggnVeaR0P2u7UGljGIVnhx1LaxVNMMZiyLvH2VrM/rs:fit/g:sm/q:90/h:505/w:500/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTgwNjcw/MDMtMTQ1NDUyODYy/My0zNDkwLmpwZWc.jpeg' },
  { discogsId: '7252111', title: 'Currents', artist: 'Tame Impala', format: 'Vinyl', year: 2015, coverUrl: 'https://i.discogs.com/0m9adSJO-pWPRlWpwczRCUJfTokcREPbsmZMprEs1-o/rs:fit/g:sm/q:90/h:592/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTcyNTIx/MTEtMTY5NzM4MTkw/MS0yMjg3LmpwZWc.jpeg' },
  { discogsId: '5006908', title: 'Music Has the Right to Children', artist: 'Boards of Canada', format: 'CD', year: 1998, coverUrl: 'https://i.discogs.com/8R1pK_WHrFD56W4XlJAAAQilpQ0pS95Fm8s9F2oC7Fo/rs:fit/g:sm/q:90/h:594/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTUwMDY5/MDgtMTUwMzkzNzYy/Ny0xNzgwLmpwZWc.jpeg' },
  { discogsId: '2911293', title: 'Thriller', artist: 'Michael Jackson', format: 'Vinyl', year: 1982, coverUrl: 'https://i.discogs.com/OQRwID3TvI5bMrPxrDgtFRftYhjZlkQ1FPE81xPOY5I/rs:fit/g:sm/q:90/h:602/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI5MTEy/OTMtMTU5NDI0NTgx/Mi03OTMxLmpwZWc.jpeg' },
  { discogsId: '194021', title: 'Purple Rain', artist: 'Prince', format: 'Vinyl', year: 1984, coverUrl: 'https://i.discogs.com/mSIjl1G4gAdx2xw9iLG1fBmNPLz_5GNo0bLqeWyDMh4/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTE5NDAy/MS0xMzM1NDAwMjg5/LmpwZWc.jpeg' },
  { discogsId: '4887177', title: 'Selected Ambient Works 85-92', artist: 'Aphex Twin', format: 'Cassette', year: 1992, coverUrl: 'https://i.discogs.com/geJx65sOZCLuuzP4OB0D0pRHj9j9OhzCOqon2RXOMEY/rs:fit/g:sm/q:90/h:602/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTQ4ODcx/NzctMTQ4NzYzMTE0/MS00ODI4LmpwZWc.jpeg' },
  { discogsId: '1174296', title: 'In Rainbows', artist: 'Radiohead', format: 'Vinyl', year: 2007, coverUrl: 'https://i.discogs.com/7y0jjFTZp88uBO380fsYcO36I3ex_er3lZn8COq90Vc/rs:fit/g:sm/q:90/h:594/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTExNzQy/OTYtMTY5NzMyNzQ3/Ny0yMzQ1LmpwZWc.jpeg' },
  { discogsId: '526351', title: 'Rumours', artist: 'Fleetwood Mac', format: 'Vinyl', year: 1977, coverUrl: 'https://i.discogs.com/X2kgbJ7rhk0HNH39Nep8tTD_Fly6pmHk2KR_Lptjk88/rs:fit/g:sm/q:90/h:599/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTUyNjM1/MS0xMjkyMjkzNjg1/LmpwZWc.jpeg' },
]

const CONDITIONS = ['M', 'NM', 'VG+', 'VG', 'G+']

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function sample<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type DiscogsTrack = { position: string; title: string; duration: string }

type DiscogsData = {
  label: string | null
  country: string | null
  tracklist: DiscogsTrack[] | null
}

async function fetchDiscogsRelease(discogsId: string): Promise<DiscogsData | null> {
  const token = process.env.DISCOGS_TOKEN
  const headers: HeadersInit = { 'User-Agent': 'Resonance/1.0' }
  if (token) headers['Authorization'] = `Discogs token=${token}`

  try {
    const response = await fetch(`https://api.discogs.com/releases/${discogsId}`, { headers })
    if (!response.ok) {
      console.warn(`   ⚠️  Discogs API returned ${response.status} for release ${discogsId}`)
      return null
    }
    const data = await response.json()
    return {
      label: data.labels?.[0]?.name ?? null,
      country: data.country ?? null,
      tracklist: data.tracklist?.map((track: { position: string; title: string; duration: string }) => ({
        position: track.position,
        title: track.title,
        duration: track.duration,
      })) ?? null,
    }
  } catch (fetchError) {
    console.warn(`   ⚠️  Discogs fetch failed for release ${discogsId}:`, fetchError)
    return null
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedDev() {
  console.log('🌱  seed-dev — starting\n')

  // 1. Users
  console.log('👤  Upserting users…')
  const createdUsers = []
  for (const seedUser of SEED_USERS) {
    const user = await db.user.upsert({
      where: { email: seedUser.email },
      update: {},
      create: {
        email: seedUser.email,
        username: seedUser.username,
        name: seedUser.name,
        emailVerified: true,
        onboardingCompleted: true,
      },
    })
    createdUsers.push(user)
    console.log(`   ✓ @${user.username} (${user.id})`)
  }

  // 2. Releases — fetch full metadata from Discogs
  console.log('\n💿  Upserting releases (fetching Discogs metadata)…')
  if (!process.env.DISCOGS_TOKEN) {
    console.log('   ℹ️  No DISCOGS_TOKEN set — requests may be rate-limited (60 req/min)')
  }

  const createdReleases = []
  for (const releaseData of SEED_RELEASES) {
    const discogsData = await fetchDiscogsRelease(releaseData.discogsId)

    const release = await db.release.upsert({
      where: { discogsId: releaseData.discogsId },
      update: {
        coverUrl: releaseData.coverUrl,
        ...(discogsData && {
          label: discogsData.label,
          country: discogsData.country,
          tracklist: discogsData.tracklist ?? undefined,
        }),
      },
      create: {
        discogsId: releaseData.discogsId,
        title: releaseData.title,
        artist: releaseData.artist,
        format: releaseData.format,
        year: releaseData.year,
        coverUrl: releaseData.coverUrl,
        label: discogsData?.label ?? null,
        country: discogsData?.country ?? null,
        tracklist: discogsData?.tracklist ?? undefined,
      },
    })

    createdReleases.push(release)
    const trackCount = Array.isArray(release.tracklist) ? (release.tracklist as unknown[]).length : 0
    const status = discogsData ? `${trackCount} tracks, label: ${release.label ?? 'none'}` : 'basic data only'
    console.log(`   ✓ ${release.title} — ${status}`)

    // Small delay to stay within Discogs rate limits (60 req/min without token)
    await delay(process.env.DISCOGS_TOKEN ? 250 : 1100)
  }

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
  .catch((error) => { console.error(error); process.exit(1) })
  .finally(() => db.$disconnect())
