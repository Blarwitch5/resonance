/**
 * One-time migration: replace fake seed-XXXX discogsIds with real Discogs IDs.
 * Existing ShelfItems are unaffected (they reference releases by UUID, not discogsId).
 * After running, visit any item detail page to trigger a live backfill from Discogs.
 *
 * Usage: pnpm tsx scripts/migrate-seed-ids.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const ID_MAP: Record<string, string> = {
  'seed-1001': '2825456',   // Abbey Road / The Beatles
  'seed-1002': '14186441',  // Dark Side of the Moon / Pink Floyd
  'seed-1003': '9287809',   // Kind of Blue / Miles Davis
  'seed-1004': '7097051',   // Nevermind / Nirvana
  'seed-1005': '4950798',   // OK Computer / Radiohead
  'seed-1006': '219517',    // Illmatic / Nas
  'seed-1007': '4570366',   // Random Access Memories / Daft Punk
  'seed-1008': '8067003',   // Blue Train / John Coltrane
  'seed-1009': '7252111',   // Currents / Tame Impala
  'seed-1010': '5006908',   // Music Has the Right to Children / BoC
  'seed-1011': '2911293',   // Thriller / Michael Jackson
  'seed-1012': '194021',    // Purple Rain / Prince
  'seed-1013': '4887177',   // Selected Ambient Works 85-92 / Aphex Twin
  'seed-1014': '1174296',   // In Rainbows / Radiohead
  'seed-1015': '526351',    // Rumours / Fleetwood Mac
}

async function main() {
  console.log('🔧  migrate-seed-ids — updating fake discogsIds to real ones\n')

  let updated = 0
  let skipped = 0

  for (const [fakeId, realId] of Object.entries(ID_MAP)) {
    const release = await db.release.findUnique({ where: { discogsId: fakeId } })
    if (!release) {
      skipped++
      continue
    }

    // Check if a release with the real ID already exists (e.g. user added the same album manually)
    const existing = await db.release.findUnique({ where: { discogsId: realId } })
    if (existing) {
      // Migrate any ShelfItems pointing to the fake release → point to the real one
      await db.shelfItem.updateMany({
        where: { releaseId: release.id },
        data: { releaseId: existing.id },
      })
      // Remove the duplicate fake release
      await db.release.delete({ where: { id: release.id } })
      console.log(`   ↗  ${fakeId} → ${realId} (merged into existing, migrated shelf items)`)
    } else {
      await db.release.update({
        where: { id: release.id },
        data: { discogsId: realId },
      })
      console.log(`   ✓  ${fakeId} → ${realId} (${release.title})`)
    }
    updated++
  }

  console.log(`\n✅  Done: ${updated} updated, ${skipped} not found (already clean)`)
  console.log('   Reload any item detail page — missing tracklist/label will be fetched from Discogs on first visit.')
}

main()
  .catch((error) => { console.error(error); process.exit(1) })
  .finally(() => db.$disconnect())
