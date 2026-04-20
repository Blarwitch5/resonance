import { safeErrorMessage } from '../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'

const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/
const RESERVED = new Set([
  'admin', 'api', 'settings', 'login', 'signup', 'onboarding',
  'profile', 'u', 'feed', 'explore', 'help', 'about', 'terms',
  'privacy', 'null', 'undefined',
])

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
    const { name, email, username } = data

    // Validation name
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return new Response(JSON.stringify({ error: 'Le nom est invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Validation email
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.includes('@')) {
        return new Response(JSON.stringify({ error: "L'email est invalide" }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const existingUser = await db.user.findUnique({ where: { email } })
      if (existingUser && existingUser.id !== session.user.id) {
        return new Response(JSON.stringify({ error: 'This email is already in use' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Validation username
    if (username !== undefined) {
      if (typeof username !== 'string' || !USERNAME_REGEX.test(username)) {
        return new Response(JSON.stringify({ error: 'Username invalide (3-20 caractères, minuscules, chiffres, - et _)' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (RESERVED.has(username)) {
        return new Response(JSON.stringify({ error: 'Username réservé' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      const existingUser = await db.user.findUnique({ where: { username } })
      if (existingUser && existingUser.id !== session.user.id) {
        return new Response(JSON.stringify({ error: 'Username déjà pris' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const updateData: { name?: string; email?: string; username?: string } = {}
    if (name !== undefined) updateData.name = name.trim()
    if (email !== undefined) updateData.email = email.trim().toLowerCase()
    if (username !== undefined) updateData.username = username.trim().toLowerCase()

    const user = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
    })

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: user.id, name: user.name, email: user.email, username: user.username },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error updating profile:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: safeErrorMessage(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
