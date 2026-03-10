import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import crypto from 'crypto'

export const prerender = false

/**
 * Endpoint pour demander une réinitialisation de mot de passe
 * POST /api/auth/forgot-password
 * Body: { email: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json()
    const { email } = data

    if (!email) {
      return new Response(
        JSON.stringify({
          error: 'Email is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Trouver l'utilisateur
    const user = await db.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: { providerId: 'credential' },
        },
      },
    })

    // Pour la sécurité, on ne révèle pas si l'email existe ou non
    // On retourne toujours un succès même si l'utilisateur n'existe pas
    let token: string | undefined
    let resetUrl: string | undefined

    if (user && user.accounts.length > 0) {
      // Générer un token de réinitialisation
      token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1) // Token valide pendant 1 heure

      // Stocker le token dans la table Verification (utilisée par Better Auth)
      await db.verification.upsert({
        where: {
          identifier_value: {
            identifier: email,
            value: token,
          },
        },
        create: {
          identifier: email,
          value: token,
          expiresAt,
        },
        update: {
          value: token,
          expiresAt,
        },
      })

      // En développement, retourner le token dans la réponse
      // En production, envoyer un email avec le lien
      resetUrl = `${import.meta.env.BETTER_AUTH_URL || import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321'}/reset-password?token=${token}`

      if (import.meta.env.DEV) {
        console.log('🔑 Token de réinitialisation (DEV):', token)
        console.log('🔗 Lien de réinitialisation:', resetUrl)
        console.log('📧 Email:', email)
      }

      // TODO: En production, envoyer un email avec le lien
      // await sendPasswordResetEmail(email, resetUrl)
    }

    // Toujours retourner un succès pour la sécurité
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
        ...(import.meta.env.DEV && token && resetUrl
          ? {
              token,
              resetUrl,
            }
          : {}),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in forgot-password:', error)
    return new Response(
      JSON.stringify({
        error: 'Error while requesting password reset',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
