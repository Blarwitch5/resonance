import { safeErrorMessage } from '../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { collectionRepository } from '../../../repositories/collection-repository'
import { itemRepository } from '../../../repositories/item-repository'

export const GET: APIRoute = async ({ request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Récupérer toutes les collections de l'utilisateur avec leurs items
    const collections = await collectionRepository.findByUserIdWithStats(session.user.id)

    // Récupérer tous les items de l'utilisateur (y compris ceux sans collection)
    const allItems = await itemRepository.findByUserId(session.user.id)

    // Préparer les données pour l'export
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      userId: session.user.id,
      collections: collections.map((collection) => ({
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        isPublic: collection.isPublic,
        coverImage: collection.coverImage,
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
        items: collection.items.map((item) => ({
          discogsId: item.discogsId,
          title: item.title,
          artist: item.artist,
          year: item.year,
          genre: item.genre,
          country: item.country,
          label: item.label,
          format: item.format,
          barcode: item.barcode,
          coverUrl: item.coverUrl,
          addedAt: item.addedAt.toISOString(),
          metadata: item.metadata
            ? {
                customCoverPath: item.metadata.customCoverPath,
                acquisitionDate: item.metadata.acquisitionDate?.toISOString(),
                purchaseLocation: item.metadata.purchaseLocation,
                purchasePrice: item.metadata.purchasePrice?.toString(),
                condition: item.metadata.condition,
                personalRating: item.metadata.personalRating,
                isListened: item.metadata.isListened,
                isFavorite: item.metadata.isFavorite,
                personalNotes: item.metadata.personalNotes,
                vinylSpeed: item.metadata.vinylSpeed,
                cdType: item.metadata.cdType,
                cassetteType: item.metadata.cassetteType,
              }
            : null,
        })),
      })),
      // Items sans collection
      itemsWithoutCollection: allItems
        .filter((item) => !item.collectionId)
        .map((item) => ({
          discogsId: item.discogsId,
          title: item.title,
          artist: item.artist,
          year: item.year,
          genre: item.genre,
          country: item.country,
          label: item.label,
          format: item.format,
          barcode: item.barcode,
          coverUrl: item.coverUrl,
          addedAt: item.addedAt.toISOString(),
          metadata: item.metadata
            ? {
                customCoverPath: item.metadata.customCoverPath,
                acquisitionDate: item.metadata.acquisitionDate?.toISOString(),
                purchaseLocation: item.metadata.purchaseLocation,
                purchasePrice: item.metadata.purchasePrice?.toString(),
                condition: item.metadata.condition,
                personalRating: item.metadata.personalRating,
                isListened: item.metadata.isListened,
                isFavorite: item.metadata.isFavorite,
                personalNotes: item.metadata.personalNotes,
                vinylSpeed: item.metadata.vinylSpeed,
                cdType: item.metadata.cdType,
                cassetteType: item.metadata.cassetteType,
              }
            : null,
        })),
    }

    // Retourner le fichier JSON en téléchargement
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="resonance-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting collections:', error)
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
