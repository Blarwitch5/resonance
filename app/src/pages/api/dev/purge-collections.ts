/**
 * API Route pour purger toutes les collections et items de la base de données
 * Garde uniquement les comptes utilisateurs
 * 
 * Usage: POST /api/dev/purge-collections
 * 
 * ⚠️ À supprimer ou sécuriser en production
 */

import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'

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

    // Compter les données avant suppression
    const [itemsCount, collectionsCount, wishlistCount] = await Promise.all([
      db.item.count(),
      db.collection.count(),
      db.wishlist.count(),
    ])

    // Supprimer dans l'ordre pour respecter les contraintes de clé étrangère
    // ItemMetadata sera supprimé automatiquement via cascade quand Item est supprimé
    
    // 1. Supprimer tous les items (cela supprimera aussi les ItemMetadata via cascade)
    const deletedItems = await db.item.deleteMany({})
    
    // 2. Supprimer toutes les collections
    const deletedCollections = await db.collection.deleteMany({})
    
    // 3. Supprimer tous les items de la wishlist
    const deletedWishlist = await db.wishlist.deleteMany({})

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Purge complète effectuée',
        deleted: {
          items: deletedItems.count,
          collections: deletedCollections.count,
          wishlist: deletedWishlist.count,
        },
        before: {
          items: itemsCount,
          collections: collectionsCount,
          wishlist: wishlistCount,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error purging collections:', error)

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
