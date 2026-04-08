import { safeErrorMessage } from '../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { collectionService } from '../../../services/collection-service'
import { collectionRepository } from '../../../repositories/collection-repository'

const MAX_COLLECTIONS_PER_USER = 2

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Vérifier la limite de collections (2 maximum, premium pour plus)
    const collectionsCount = await collectionRepository.countByUserId(session.user.id)
    if (collectionsCount >= MAX_COLLECTIONS_PER_USER) {
      return new Response(
        JSON.stringify({
          error: `Limite atteinte : vous ne pouvez pas créer plus de ${MAX_COLLECTIONS_PER_USER} collections.`,
          maxCollections: MAX_COLLECTIONS_PER_USER,
          currentCount: collectionsCount,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const data = await request.json()

    // Validation
    if (!data.name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Générer un slug à partir du nom
    const slug = data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    const collection = await collectionService.createCollection(session.user.id, {
      name: data.name,
      slug,
      description: data.description || null,
      isPublic: data.isPublic || false,
      coverImage: data.coverImage || null,
    })

    return new Response(JSON.stringify(collection), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating collection:', error)
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

