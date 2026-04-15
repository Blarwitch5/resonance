import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/profile/export
// Rate-limited: 1 request per user per hour
export const GET: APIRoute = async ({ locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const user = await db.user.findUnique({
      where: { id: currentUser.id },
      select: { lastExportAt: true },
    })

    // Rate limit: 1 per hour
    if (user?.lastExportAt) {
      const elapsed = Date.now() - user.lastExportAt.getTime()
      const oneHour = 60 * 60 * 1000
      if (elapsed < oneHour) {
        const retryAfter = Math.ceil((oneHour - elapsed) / 1000)
        return new Response(
          JSON.stringify({
            error: 'Export rate limited. Please wait before requesting another export.',
            retryAfterSeconds: retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
            },
          },
        )
      }
    }

    // Update lastExportAt before heavy query to prevent double-request abuse
    await db.user.update({
      where: { id: currentUser.id },
      data: { lastExportAt: new Date() },
    })

    // Gather all user data
    const [profile, shelfItems, collections, wants, activities, comments] = await Promise.all([
      db.user.findUnique({
        where: { id: currentUser.id },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          bio: true,
          createdAt: true,
        },
      }),
      db.shelfItem.findMany({
        where: { userId: currentUser.id },
        include: { release: true },
      }),
      db.collection.findMany({
        where: { userId: currentUser.id },
        include: { items: { include: { shelfItem: { include: { release: true } } } } },
      }),
      db.want.findMany({
        where: { userId: currentUser.id },
        include: { release: true },
      }),
      db.activity.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
      }),
      db.activityComment.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile,
      shelf: shelfItems,
      collections,
      wants,
      activities,
      comments,
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="resonance-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
