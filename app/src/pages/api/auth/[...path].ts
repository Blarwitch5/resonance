import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'

export const prerender = false

export const ALL: APIRoute = async (context) => {
  try {
    // Passer directement la requête comme dans la documentation officielle
    // Better-auth gère automatiquement le basePath
    return await auth.handler(context.request)
  } catch (error) {
    console.error('❌ Error in better-auth handler:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
