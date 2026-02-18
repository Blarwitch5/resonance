import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Supprimer toutes les données associées à l'utilisateur
    // Prisma supprimera automatiquement les relations en cascade grâce à onDelete: Cascade
    // Mais on va être explicite pour être sûr

    const userId = session.user.id

    // Supprimer dans l'ordre pour éviter les erreurs de contrainte
    await db.wishlist.deleteMany({
      where: { userId },
    })

    await db.itemMetadata.deleteMany({
      where: {
        item: {
          userId,
        },
      },
    })

    await db.item.deleteMany({
      where: { userId },
    })

    await db.collection.deleteMany({
      where: { userId },
    })

    // Supprimer les sessions
    await db.session.deleteMany({
      where: { userId },
    })

    // Supprimer les comptes (accounts)
    await db.account.deleteMany({
      where: { userId },
    })

    // Enfin, supprimer l'utilisateur lui-même
    await db.user.delete({
      where: { id: userId },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compte supprimé avec succès',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error deleting account:', error)
    return new Response(
      JSON.stringify({
        error: 'Erreur interne du serveur',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
