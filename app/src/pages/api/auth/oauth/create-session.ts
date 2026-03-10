import type { APIRoute } from 'astro'
import { db } from '../../../../lib/db'
import crypto from 'crypto'
import { hash } from 'bcryptjs'

export const prerender = false

/**
 * Endpoint pour créer une session Better Auth après OAuth
 * GET /api/auth/oauth/create-session?token=...&callback=...
 * 
 * Crée une session Better Auth pour l'utilisateur authentifié via OAuth
 */
export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('token')
  const callbackURL = url.searchParams.get('callback') || '/'

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Token manquant' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Vérifier le token temporaire
    const verification = await db.verification.findFirst({
      where: {
        value: token,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!verification) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Récupérer l'utilisateur
    const user = await db.user.findUnique({
      where: { id: verification.identifier },
    })

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Créer une session Better Auth en utilisant l'API Better Auth
    // On crée une requête POST vers l'endpoint de création de session de Better Auth
    const baseURL = import.meta.env.BETTER_AUTH_URL || import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321'
    
    // Créer un mot de passe temporaire pour l'utilisateur (si nécessaire)
    // Better Auth nécessite un compte credential pour créer une session
    let account = await db.account.findFirst({
      where: {
        userId: user.id,
        providerId: 'credential',
      },
    })

    if (!account) {
      // Créer un compte credential avec un mot de passe aléatoire
      // L'utilisateur pourra toujours utiliser OAuth pour se connecter
      const tempPassword = crypto.randomBytes(16).toString('hex')
      const hashedPassword = await hash(tempPassword, 10)
      
      account = await db.account.create({
        data: {
          userId: user.id,
          accountId: user.email,
          providerId: 'credential',
          password: hashedPassword,
        },
      })
    }

    // Supprimer le token de vérification temporaire
    await db.verification.delete({
      where: { id: verification.id },
    })

    // Rediriger vers la page d'accueil avec un paramètre pour créer la session
    // On utilisera un endpoint qui créera la session via Better Auth
    const sessionCreationURL = `${baseURL}/api/auth/oauth/finalize-session?userId=${user.id}&callback=${encodeURIComponent(callbackURL)}`
    
    return Response.redirect(sessionCreationURL, 302)
  } catch (error) {
    console.error('Error creating session:', error)
    return new Response(
      JSON.stringify({
        error: 'Error while creating session',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
