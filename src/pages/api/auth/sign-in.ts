import { safeErrorMessage } from '../../../../lib/api-error'
import type { APIRoute } from 'astro'

export const prerender = false

async function handle(context: { request: Request }): Promise<Response> {
  try {
    const { auth } = await import('../../../lib/auth')
    return await auth.handler(context.request)
  } catch (error) {
    console.error('❌ Error in better-auth sign-in:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const GET: APIRoute = handle
export const POST: APIRoute = handle
