import type { APIRoute } from 'astro'
import { releaseRepository } from '../../../repositories/release-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/releases/[discogsId]
export const GET: APIRoute = async ({ params, locals }) => {
  const currentUser = locals.user
  if (!currentUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const discogsId = params.discogsId
  if (!discogsId) {
    return new Response(JSON.stringify({ error: 'Discogs ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const release = await releaseRepository.findOrCreateFromDiscogs(discogsId)
    if (!release) {
      return new Response(JSON.stringify({ error: 'Release not found on Discogs' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ release }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
