import { safeErrorMessage } from '../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../../lib/auth'
import { db } from '../../../../lib/db'
import { collectionRepository } from '../../../../repositories/collection-repository'
import { discogsService } from '../../../../services/discogs-service'
import { itemService } from '../../../../services/item-service'

export const prerender = false

/**
 * Endpoint pour ajouter un album depuis l'explorer à une collection
 * POST /api/explorer/[discogsId]/add-to-collection
 * 
 * Body: {
 *   collectionId?: string (optionnel, null = non classé)
 *   format?: 'VINYL' | 'CD' | 'CASSETTE'
 * }
 */
export const POST: APIRoute = async ({ params, request }) => {
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

    // Vérifier si l'item existe déjà
    const existingItem = await db.item.findFirst({
      where: {
        discogsId,
        userId: session.user.id,
      },
    })

    if (existingItem) {
      return new Response(
        JSON.stringify({
          error: 'Item already exists in your collection',
          item: existingItem,
          redirectTo: `/items/${existingItem.slug}`,
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const data = await request.json()
    const collectionId = data.collectionId || null
    const format = data.format || 'VINYL'

    // Vérifier que la collection appartient à l'utilisateur si fournie
    if (collectionId) {
      const collection = await collectionRepository.findById(collectionId, session.user.id)
      if (!collection) {
        return new Response(
          JSON.stringify({ error: 'Collection not found or unauthorized' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
    }

    // Récupérer les détails depuis Discogs
    const release = await discogsService.getRelease(discogsId)

    // Extraire le titre et l'artiste
    const title = release.title || 'Unknown'
    const artist = release.artists && release.artists.length > 0
      ? release.artists.map((artistItem) => artistItem.name).join(', ')
      : 'Unknown Artist'

    // Déterminer le format depuis les formats Discogs ou utiliser celui fourni
    let itemFormat: 'VINYL' | 'CD' | 'CASSETTE' = format as 'VINYL' | 'CD' | 'CASSETTE'
    if (release.formats && release.formats.length > 0) {
      const formatString = release.formats[0].name?.toUpperCase() || ''
      if (formatString.includes('VINYL') || formatString.includes('LP') || formatString.includes('12"')) {
        itemFormat = 'VINYL'
      } else if (formatString.includes('CD')) {
        itemFormat = 'CD'
      } else if (formatString.includes('CASSETTE') || formatString.includes('TAPE')) {
        itemFormat = 'CASSETTE'
      }
    }

    // Créer l'item
    const item = await itemService.createItem(session.user.id, {
      discogsId,
      title,
      artist,
      year: release.year || null,
      genre: release.genres && release.genres.length > 0 ? release.genres[0] : null,
      country: release.country || null,
      label: release.labels && release.labels.length > 0 ? release.labels[0].name : null,
      format: itemFormat,
      barcode: release.identifiers?.find((id) => id.type === 'Barcode')?.value || null,
      coverUrl: release.cover_image || release.thumb || null,
      collection: collectionId
        ? {
            connect: { id: collectionId },
          }
        : undefined,
    })

    return new Response(
      JSON.stringify({
        success: true,
        item,
        redirectTo: `/items/${item.slug}`,
        message: collectionId
          ? 'Album ajouté à la collection'
          : 'Album ajouté à votre bibliothèque',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error adding item from explorer:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return new Response(
        JSON.stringify({ error: 'Release not found on Discogs' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

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
