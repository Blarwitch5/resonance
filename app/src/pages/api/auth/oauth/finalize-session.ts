import type { APIRoute } from 'astro'
import { db } from '../../../../lib/db'
import crypto from 'crypto'

export const prerender = false

/**
 * Endpoint pour finaliser la création de session après OAuth
 * GET /api/auth/oauth/finalize-session?userId=...&callback=...
 * 
 * Crée une session Better Auth en utilisant l'API interne
 */
export const GET: APIRoute = async ({ url, request }) => {
  const userId = url.searchParams.get('userId')
  const callbackURL = url.searchParams.get('callback') || '/'

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'User ID manquant' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Récupérer l'utilisateur
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        accounts: {
          where: { providerId: 'credential' },
        },
      },
    })

    if (!user || !user.accounts.length) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur ou compte non trouvé' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Créer une session via Better Auth
    // Better Auth gère les sessions via son système interne
    // On crée une session directement dans la base de données avec le format Better Auth
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 jours

    const session = await db.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    })

    // Créer une réponse de redirection avec le cookie de session
    const response = Response.redirect(callbackURL, 302)
    
    // Définir le cookie de session Better Auth
    // Le nom du cookie peut varier selon la configuration Better Auth
    const cookieName = 'better-auth.session_token'
    const cookieValue = sessionToken
    const cookieOptions = [
      `${cookieName}=${cookieValue}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${30 * 24 * 60 * 60}`, // 30 jours en secondes
      ...(import.meta.env.PROD ? ['Secure'] : []),
    ].join('; ')

    response.headers.set('Set-Cookie', cookieOptions)

    return response
  } catch (error) {
    console.error('Error finalizing session:', error)
    return new Response(
      JSON.stringify({
        error: 'Erreur lors de la finalisation de la session',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
