import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'
import { checkRateLimit, retryAfterSeconds } from '../../../lib/rate-limit'
import { stripHtml } from '../../../lib/sanitize'
import { collectionRepository } from '../../../repositories/collection-repository'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

type ImportRelease = {
  discogsId?: string | null
  title?: string
  artist?: string
  label?: string | null
  year?: number | null
  country?: string | null
  format?: string
  coverUrl?: string | null
  tracklist?: unknown
}

type ImportShelfItem = {
  condition?: string
  rating?: number | null
  note?: string | null
  acquiredAt?: string | null
  release?: ImportRelease
}

type ImportCollectionItem = {
  shelfItem?: { release?: ImportRelease }
}

type ImportCollection = {
  name?: string
  description?: string | null
  isPublic?: boolean
  items?: ImportCollectionItem[]
}

type ImportPayload = {
  shelf?: ImportShelfItem[]
  collections?: ImportCollection[]
}

const VALID_CONDITIONS = new Set(['Mint', 'NM', 'EX', 'VG+', 'VG', 'G'])
const VALID_FORMATS = new Set(['Vinyl', 'CD', 'Cassette'])

// POST /api/collections/import
// Body: multipart/form-data with field "file" (JSON export file)
export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!checkRateLimit(`collections-import:${ip}`, 3, 60 * 60_000)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds(`collections-import:${ip}`)),
      },
    })
  }

  let payload: ImportPayload
  try {
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const file = form.get('file')
      if (!file || typeof file === 'string') {
        return new Response(JSON.stringify({ error: 'Missing file field' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({ error: 'File too large (max 10 MB)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const text = await file.text()
      payload = JSON.parse(text) as ImportPayload
    } else {
      payload = await request.json() as ImportPayload
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON file' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!payload || typeof payload !== 'object') {
    return new Response(JSON.stringify({ error: 'Invalid export format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const shelfItems = Array.isArray(payload.shelf) ? payload.shelf : []
  const collections = Array.isArray(payload.collections) ? payload.collections : []

  if (shelfItems.length === 0 && collections.length === 0) {
    return new Response(JSON.stringify({ error: 'Nothing to import' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Map discogsId → new internal release ID (built during shelf import)
  const discogsIdToReleaseId = new Map<string, string>()

  let shelfCreated = 0
  let shelfSkipped = 0

  // ── 1. Import shelf items ──────────────────────────────────────────────────
  for (const item of shelfItems) {
    const releaseData = item.release
    if (!releaseData) { shelfSkipped++; continue }

    const condition = VALID_CONDITIONS.has(item.condition ?? '') ? item.condition! : 'VG'
    const format = VALID_FORMATS.has(releaseData.format ?? '') ? releaseData.format! : 'Vinyl'
    const title = releaseData.title?.trim() || 'Unknown'
    const artist = releaseData.artist?.trim() || 'Unknown'

    // Upsert release using export data — no Discogs API call needed
    let release: { id: string } | null = null

    if (releaseData.discogsId) {
      release = await db.release.upsert({
        where: { discogsId: releaseData.discogsId },
        create: {
          discogsId: releaseData.discogsId,
          title,
          artist,
          label: releaseData.label ?? null,
          year: releaseData.year ?? null,
          country: releaseData.country ?? null,
          format,
          coverUrl: releaseData.coverUrl ?? null,
          tracklist: releaseData.tracklist ? (releaseData.tracklist as object) : undefined,
        },
        update: {
          // Only backfill missing fields, don't overwrite richer data
          label: releaseData.label ?? undefined,
          year: releaseData.year ?? undefined,
          country: releaseData.country ?? undefined,
          coverUrl: releaseData.coverUrl ?? undefined,
          tracklist: releaseData.tracklist ? (releaseData.tracklist as object) : undefined,
        },
        select: { id: true },
      })
      discogsIdToReleaseId.set(releaseData.discogsId, release.id)
    } else {
      // No Discogs ID — match by title+artist or create
      const existing = await db.release.findFirst({
        where: { title, artist, format },
        select: { id: true },
      })
      release = existing ?? await db.release.create({
        data: { title, artist, format, label: null, year: null, country: null },
        select: { id: true },
      })
    }

    // Skip if user already has this on shelf
    const onShelf = await db.shelfItem.findFirst({
      where: { userId: currentUser.id, releaseId: release.id },
      select: { id: true },
    })
    if (onShelf) { shelfSkipped++; continue }

    await db.shelfItem.create({
      data: {
        userId: currentUser.id,
        releaseId: release.id,
        condition,
        rating: typeof item.rating === 'number' && item.rating >= 1 && item.rating <= 5 ? item.rating : null,
        note: item.note ? stripHtml(item.note).slice(0, 2000) : null,
        acquiredAt: item.acquiredAt ? new Date(item.acquiredAt) : null,
      },
    })
    shelfCreated++
  }

  // ── 2. Import collections ──────────────────────────────────────────────────
  let collectionsCreated = 0
  let collectionsSkipped = 0

  for (const col of collections) {
    const name = col.name?.trim()
    if (!name || name.length > 100) { collectionsSkipped++; continue }

    const collection = await collectionRepository.createWithSlug({
      userId: currentUser.id,
      name: stripHtml(name),
      description: col.description ? stripHtml(col.description).slice(0, 500) : undefined,
      isPublic: col.isPublic !== false,
    })
    collectionsCreated++

    // Add items to collection
    const colItems = Array.isArray(col.items) ? col.items : []
    for (const colItem of colItems) {
      const discogsId = colItem.shelfItem?.release?.discogsId
      if (!discogsId) continue

      const releaseId = discogsIdToReleaseId.get(discogsId)
      if (!releaseId) continue

      const shelfItem = await db.shelfItem.findFirst({
        where: { userId: currentUser.id, releaseId },
        select: { id: true },
      })
      if (!shelfItem) continue

      await db.collectionItem.upsert({
        where: { collectionId_shelfItemId: { collectionId: collection.id, shelfItemId: shelfItem.id } },
        create: { collectionId: collection.id, shelfItemId: shelfItem.id },
        update: {},
      })
    }
  }

  return new Response(
    JSON.stringify({
      imported: {
        shelf: shelfCreated,
        collections: collectionsCreated,
      },
      skipped: {
        shelf: shelfSkipped,
        collections: collectionsSkipped,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
