import type { APIRoute } from 'astro'

export const prerender = false

async function handleAuthRequest(request: Request): Promise<Response> {
  try {
    const { auth } = await import('../../../lib/auth')
    return await auth.handler(request)
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

// Export explicite GET et POST pour éviter 404 (certains environnements ne routent pas bien vers ALL)
export const GET: APIRoute = async (context) => handleAuthRequest(context.request)
export const POST: APIRoute = async (context) => handleAuthRequest(context.request)
export const PUT: APIRoute = async (context) => handleAuthRequest(context.request)
export const DELETE: APIRoute = async (context) => handleAuthRequest(context.request)
export const PATCH: APIRoute = async (context) => handleAuthRequest(context.request)
export const ALL: APIRoute = async (context) => handleAuthRequest(context.request)
