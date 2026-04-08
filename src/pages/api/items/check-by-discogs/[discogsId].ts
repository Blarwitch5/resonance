import { safeErrorMessage } from '../../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db'

export const prerender = false

/**
 * Endpoint pour vérifier si un album existe déjà pour l'utilisateur
 * GET /api/items/check-by-discogs/[discogsId]
 * 
 * Retourne si l'album existe et son itemId si c'est le cas
 */
export const GET: APIRoute = async ({ params, request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const discogsIdParam = params.discogsId

    if (!discogsIdParam) {
      return new Response(
        JSON.stringify({ error: 'Missing discogsId parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const discogsId = Number.parseInt(discogsIdParam, 10)

    if (Number.isNaN(discogsId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid discogsId parameter' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Chercher si l'item existe déjà pour cet utilisateur
    const existingItem = await db.item.findFirst({
      where: {
        discogsId,
        userId: session.user.id,
      },
      select: {
        id: true,
        slug: true,
        collectionId: true,
        collection: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    })

    return new Response(
      JSON.stringify({
        exists: !!existingItem,
        itemId: existingItem?.id || null,
        itemSlug: existingItem?.slug || null,
        collection: existingItem?.collection
          ? {
              id: existingItem.collectionId,
              name: existingItem.collection.name,
              slug: existingItem.collection.slug,
            }
          : null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error checking item by discogsId:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
