import type { APIRoute } from 'astro'
import { db } from '../../../lib/db'
import { hash } from 'bcryptjs'

export const prerender = false

/**
 * Fonction de validation du mot de passe
 */
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 8 caractères' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une minuscule' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une majuscule' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre' }
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: 'Le mot de passe doit contenir au moins un caractère spécial',
    }
  }

  return { valid: true }
}

/**
 * Endpoint pour réinitialiser le mot de passe avec un token
 * POST /api/auth/reset-password
 * Body: { token: string, password: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json()
    const { token, password } = data

    if (!token || !password) {
      return new Response(
        JSON.stringify({
          error: 'Token et mot de passe requis',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Valider le mot de passe
    const validation = validatePassword(password)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: validation.error,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Trouver le token de vérification
    const verification = await db.verification.findFirst({
      where: {
        value: token,
        expiresAt: {
          gt: new Date(), // Token non expiré
        },
      },
    })

    if (!verification) {
      return new Response(
        JSON.stringify({
          error: 'Token invalide ou expiré',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Trouver l'utilisateur par email (identifier)
    const user = await db.user.findUnique({
      where: { email: verification.identifier },
      include: {
        accounts: {
          where: { providerId: 'credential' },
        },
      },
    })

    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Utilisateur non trouvé',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Trouver ou créer le compte credential
    let account = user.accounts.find((acc) => acc.providerId === 'credential')

    if (!account) {
      // Créer un nouveau compte credential
      account = await db.account.create({
        data: {
          userId: user.id,
          accountId: user.email,
          providerId: 'credential',
          password: await hash(password, 10),
        },
      })
    } else {
      // Mettre à jour le mot de passe
      account = await db.account.update({
        where: { id: account.id },
        data: {
          password: await hash(password, 10),
        },
      })
    }

    // Supprimer le token de vérification (utilisé une seule fois)
    await db.verification.delete({
      where: {
        id: verification.id,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in reset-password:', error)
    return new Response(
      JSON.stringify({
        error: 'Erreur lors de la réinitialisation du mot de passe',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
