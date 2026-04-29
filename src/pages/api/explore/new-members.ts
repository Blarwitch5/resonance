import type { APIRoute } from 'astro'
import { exploreRepository } from '../../../repositories/explore-repository'
import { blockRepository } from '../../../repositories/block-repository'
import { safeErrorMessage } from '../../../lib/api-error'

// GET /api/explore/new-members
export const GET: APIRoute = async ({ locals }) => {
  try {
    const currentUser = locals.user
    let excludeIds: string[] = []

    // Exclude users who blocked the current user or are blocked by them
    if (currentUser) {
      const [blocked, blockedBy] = await Promise.all([
        blockRepository.getBlockedIds(currentUser.id),
        blockRepository.getBlockedByIds(currentUser.id),
      ])
      excludeIds = [...blocked, ...blockedBy, currentUser.id]
    }

    const members = await exploreRepository.getNewActiveMembers(excludeIds, 8)
    return new Response(JSON.stringify({ members }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: safeErrorMessage(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
