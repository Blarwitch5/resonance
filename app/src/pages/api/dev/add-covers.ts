import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'
import { discogsService } from '../../../services/discogs-service'

// Types pour les releases Discogs
type DiscogsImage = { type?: string; uri?: string; resource_url?: string }
type DiscogsRelease = { images?: DiscogsImage[]; cover_image?: string; thumb?: string }

// Fonction pour extraire la meilleure cover d'une release Discogs
function getBestCoverUrl(release: DiscogsRelease): string | null {
  // Préférer les images haute résolution du tableau images
  if (release.images && release.images.length > 0) {
    // Chercher l'image principale (type "primary" ou la première)
    const primaryImage = release.images.find((image: DiscogsImage) => image.type === 'primary') || release.images[0]
    return primaryImage.uri || primaryImage.resource_url || null
  }
  // Sinon utiliser cover_image, puis thumb
  return release.cover_image || release.thumb || null
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Vérifier que l'utilisateur est connecté
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Récupérer tous les items de l'utilisateur sans coverUrl ou avec coverUrl placeholder
    const itemsWithoutCover = await db.item.findMany({
      where: {
        userId: session.user.id,
        OR: [
          { coverUrl: null },
          { coverUrl: '' },
          { coverUrl: { startsWith: 'https://via.placeholder.com' } },
        ],
      },
    })

    if (itemsWithoutCover.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Tous les items ont déjà une cover de Discogs',
          stats: {
            updated: 0,
            skipped: 0,
            failed: 0,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Mettre à jour chaque item avec la cover de Discogs
    let updatedCount = 0
    let skippedCount = 0
    let failedCount = 0

    // Limiter le nombre de requêtes pour éviter de surcharger l'API Discogs
    const batchSize = 5
    for (let i = 0; i < itemsWithoutCover.length; i += batchSize) {
      const batch = itemsWithoutCover.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (item) => {
          try {
            // Récupérer la release depuis Discogs
            const release = await discogsService.getRelease(item.discogsId)
            
            // Extraire la meilleure cover
            const coverUrl = getBestCoverUrl(release)
            
            if (coverUrl) {
              await db.item.update({
                where: { id: item.id },
                data: { coverUrl },
              })
              updatedCount++
            } else {
              // Pas de cover disponible
              skippedCount++
            }
          } catch (error) {
            console.error(`Error fetching cover for item ${item.id} (discogsId: ${item.discogsId}):`, error)
            failedCount++
          }
        })
      )

      // Délai entre les batches pour respecter les limites de l'API Discogs
      if (i + batchSize < itemsWithoutCover.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Covers récupérées depuis Discogs avec succès',
        stats: {
          updated: updatedCount,
          skipped: skippedCount,
          failed: failedCount,
          total: itemsWithoutCover.length,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error adding covers:', error)
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
