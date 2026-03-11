import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'
import { hash } from 'bcryptjs'

// Fonction de validation du mot de passe
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' }
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)' }
  }

  return { valid: true }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await request.json()
    const { currentPassword, newPassword } = data

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Current password and new password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Récupérer le compte de l'utilisateur avec le mot de passe hashé
    const account = await db.account.findFirst({
      where: { userId: session.user.id, providerId: 'credential' },
    })

    if (!account || !account.password) {
      return new Response(JSON.stringify({ error: 'No password found for this account' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Vérifier le mot de passe actuel
    const bcrypt = await import('bcryptjs')
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, account.password)

    if (!isCurrentPasswordValid) {
      return new Response(JSON.stringify({ error: 'Current password is incorrect' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Valider le nouveau mot de passe
    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Vérifier que le nouveau mot de passe est différent de l'ancien
    const isSamePassword = await bcrypt.compare(newPassword, account.password)
    if (isSamePassword) {
      return new Response(JSON.stringify({ error: 'New password must be different from the current one' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await hash(newPassword, 10)

    // Mettre à jour le mot de passe
    await db.account.update({
      where: { id: account.id },
      data: { password: hashedPassword },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password updated successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error changing password:', error)
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
