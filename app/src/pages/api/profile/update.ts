import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'

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
    const { name, email } = data

    // Validation
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return new Response(JSON.stringify({ error: 'Le nom est invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.includes('@')) {
        return new Response(JSON.stringify({ error: 'L\'email est invalide' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Vérifier si l'email est déjà utilisé par un autre utilisateur
      const existingUser = await db.user.findUnique({
        where: { email },
      })

      if (existingUser && existingUser.id !== session.user.id) {
        return new Response(JSON.stringify({ error: 'This email is already in use' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Préparer les données à mettre à jour
    const updateData: { name?: string; email?: string } = {}
    if (name !== undefined) {
      updateData.name = name.trim()
    }
    if (email !== undefined) {
      updateData.email = email.trim().toLowerCase()
    }

    // Mettre à jour l'utilisateur
    const user = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
    })

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error updating profile:', error)
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
