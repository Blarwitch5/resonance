import type { APIRoute } from 'astro'
import { hashPassword, verifyPassword } from 'better-auth/crypto'
import { db } from '../../../lib/db'
import { safeErrorMessage } from '../../../lib/api-error'

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' }
  if (!/[a-z]/.test(password)) return { valid: false, error: 'Password must contain at least one lowercase letter' }
  if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must contain at least one uppercase letter' }
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain at least one number' }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' }
  }
  return { valid: true }
}

// POST /api/auth/change-password
// Body: { currentPassword: string, newPassword: string }
export const POST: APIRoute = async ({ request, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let currentPassword: string, newPassword: string
  try {
    const body = await request.json()
    currentPassword = body?.currentPassword ?? ''
    newPassword = body?.newPassword ?? ''
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!currentPassword || !newPassword) {
    return new Response(JSON.stringify({ error: 'currentPassword and newPassword are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const validation = validatePassword(newPassword)
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const account = await db.account.findFirst({
      where: { userId: currentUser.id, providerId: 'credential' },
    })

    if (!account?.password) {
      return new Response(
        JSON.stringify({ error: 'No password set for this account. Use OAuth sign-in.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const isValid = await verifyPassword({ hash: account.password, password: currentPassword })
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Current password is incorrect' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await db.account.update({
      where: { id: account.id },
      data: { password: await hashPassword(newPassword) },
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
