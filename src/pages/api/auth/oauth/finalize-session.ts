import { safeErrorMessage } from '../../../../lib/api-error'
import type { APIRoute } from 'astro'
import { db } from '../../../../lib/db'
import crypto from 'crypto'

export const prerender = false

/**
 * Endpoint pour finaliser la création de session après OAuth
 * GET /api/auth/oauth/finalize-session?token=...&callback=...
 *
 * Crée une session Better Auth pour l'utilisateur authentifié via OAuth.
 * Le token est un jeton à usage unique créé par create-session.ts — le userId
 * n'est jamais exposé dans l'URL pour éviter la prise de contrôle de compte.
 */
export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('token')
  const callbackURL = url.searchParams.get('callback') || '/'

  // Valider que callbackURL est une URL relative (pas de redirection ouverte)
  const safeCallback = callbackURL.startsWith('/') && !callbackURL.startsWith('//') ? callbackURL : '/'

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
    // Vérifier et consommer le token à usage unique
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

    const userId = verification.identifier

    // Consommer le token immédiatement (usage unique)
    await db.verification.delete({ where: { id: verification.id } })

    // Récupérer l'utilisateur
    const user = await db.user.findUnique({
      where: { id: userId },
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

    // Créer une session Better Auth directement en base
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 jours

    await db.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    })

    // Définir le cookie de session et rediriger
    const cookieName = 'better-auth.session_token'
    const cookieOptions = [
      `${cookieName}=${sessionToken}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${30 * 24 * 60 * 60}`,
      ...(import.meta.env.PROD ? ['Secure'] : []),
    ].join('; ')

    const response = Response.redirect(safeCallback, 302)
    response.headers.set('Set-Cookie', cookieOptions)
    return response
  } catch (error) {
    console.error('Error finalizing session:', error)
    return new Response(
      JSON.stringify({
        error: 'Error while finalizing session',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
