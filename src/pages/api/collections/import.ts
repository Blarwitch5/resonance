import type { APIRoute } from 'astro'
import { z } from 'zod'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'
import { collectionRepository } from '../../../repositories/collection-repository'
import { itemService } from '../../../services/item-service'

// Schéma de validation pour l'import
const ImportItemSchema = z.object({
  discogsId: z.number(),
  title: z.string(),
  artist: z.string(),
  year: z.number().optional().nullable(),
  genre: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  format: z.enum(['VINYL', 'CD', 'CASSETTE']),
  barcode: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  addedAt: z.string().optional(),
  metadata: z
    .object({
      customCoverPath: z.string().optional().nullable(),
      acquisitionDate: z.string().optional().nullable(),
      purchaseLocation: z.string().optional().nullable(),
      purchasePrice: z.string().optional().nullable(),
      condition: z.string().optional().nullable(),
      personalRating: z.number().optional().nullable(),
      isListened: z.boolean().optional(),
      isFavorite: z.boolean().optional(),
      personalNotes: z.string().optional().nullable(),
      vinylSpeed: z.string().optional().nullable(),
      cdType: z.string().optional().nullable(),
      cassetteType: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
})

const ImportCollectionSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  coverImage: z.string().optional().nullable(),
  items: z.array(ImportItemSchema),
})

const ImportDataSchema = z.object({
  version: z.string().optional(),
  collections: z.array(ImportCollectionSchema).optional(),
  itemsWithoutCollection: z.array(ImportItemSchema).optional(),
})

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Lire le contenu du fichier
    const fileContent = await file.text()
    let importData: unknown

    try {
      importData = JSON.parse(fileContent)
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Valider les données
    const validationResult = ImportDataSchema.safeParse(importData)
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid import file format',
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const data = validationResult.data
    const stats = {
      collectionsCreated: 0,
      itemsCreated: 0,
      itemsSkipped: 0,
      errors: [] as string[],
    }

    // Importer les collections
    if (data.collections && data.collections.length > 0) {
      for (const collectionData of data.collections) {
        try {
          // Vérifier si la collection existe déjà
          const existing = await collectionRepository.findBySlug(collectionData.slug, session.user.id)

          let collectionId: string
          if (existing) {
            // Mettre à jour la collection existante
            const updated = await collectionRepository.updateCollection(existing.id, {
              name: collectionData.name,
              description: collectionData.description,
              isPublic: collectionData.isPublic ?? false,
              coverImage: collectionData.coverImage,
            })
            collectionId = updated.id
          } else {
            // Créer une nouvelle collection
            const created = await collectionRepository.createCollection({
              name: collectionData.name,
              slug: collectionData.slug,
              description: collectionData.description,
              isPublic: collectionData.isPublic ?? false,
              coverImage: collectionData.coverImage,
              user: {
                connect: { id: session.user.id },
              },
            })
            collectionId = created.id
            stats.collectionsCreated++
          }

          // Importer les items de la collection
          for (const itemData of collectionData.items) {
            try {
              // Vérifier si l'item existe déjà
              const existingItem = await db.item.findFirst({
                where: {
                  discogsId: itemData.discogsId,
                  userId: session.user.id,
                  collectionId: collectionId,
                },
              })

              if (existingItem) {
                stats.itemsSkipped++
                continue
              }

              // Créer l'item (slug généré par le service)
              const item = await itemService.createItem(session.user.id, {
                discogsId: itemData.discogsId,
                title: itemData.title,
                artist: itemData.artist,
                year: itemData.year ?? null,
                genre: itemData.genre ?? null,
                country: itemData.country ?? null,
                label: itemData.label ?? null,
                format: itemData.format,
                barcode: itemData.barcode ?? null,
                coverUrl: itemData.coverUrl ?? null,
                addedAt: itemData.addedAt ? new Date(itemData.addedAt) : new Date(),
                collection: {
                  connect: { id: collectionId },
                },
              })

              // Créer les métadonnées si présentes
              if (itemData.metadata) {
                await db.itemMetadata.create({
                  data: {
                    itemId: item.id,
                    customCoverPath: itemData.metadata.customCoverPath ?? null,
                    acquisitionDate: itemData.metadata.acquisitionDate
                      ? new Date(itemData.metadata.acquisitionDate)
                      : null,
                    purchaseLocation: itemData.metadata.purchaseLocation ?? null,
                    purchasePrice: itemData.metadata.purchasePrice
                      ? parseFloat(itemData.metadata.purchasePrice)
                      : null,
                    condition: itemData.metadata.condition ?? null,
                    personalRating: itemData.metadata.personalRating ?? null,
                    isListened: itemData.metadata.isListened ?? false,
                    isFavorite: itemData.metadata.isFavorite ?? false,
                    personalNotes: itemData.metadata.personalNotes ?? null,
                    vinylSpeed: itemData.metadata.vinylSpeed ?? null,
                    cdType: itemData.metadata.cdType ?? null,
                    cassetteType: itemData.metadata.cassetteType ?? null,
                  },
                })
              }

              stats.itemsCreated++
            } catch (error) {
              stats.errors.push(`Error importing item "${itemData.title}": ${error instanceof Error ? error.message : 'Unknown error'}`)
            }
          }
        } catch (error) {
          stats.errors.push(`Error importing collection "${collectionData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    // Importer les items sans collection
    if (data.itemsWithoutCollection && data.itemsWithoutCollection.length > 0) {
      for (const itemData of data.itemsWithoutCollection) {
        try {
          // Vérifier si l'item existe déjà
          const existingItem = await db.item.findFirst({
            where: {
              discogsId: itemData.discogsId,
              userId: session.user.id,
              collectionId: null,
            },
          })

          if (existingItem) {
            stats.itemsSkipped++
            continue
          }

          // Créer l'item (slug généré par le service)
          const item = await itemService.createItem(session.user.id, {
            discogsId: itemData.discogsId,
            title: itemData.title,
            artist: itemData.artist,
            year: itemData.year ?? null,
            genre: itemData.genre ?? null,
            country: itemData.country ?? null,
            label: itemData.label ?? null,
            format: itemData.format,
            barcode: itemData.barcode ?? null,
            coverUrl: itemData.coverUrl ?? null,
            addedAt: itemData.addedAt ? new Date(itemData.addedAt) : new Date(),
          })

          // Créer les métadonnées si présentes
          if (itemData.metadata) {
            await db.itemMetadata.create({
              data: {
                itemId: item.id,
                customCoverPath: itemData.metadata.customCoverPath ?? null,
                acquisitionDate: itemData.metadata.acquisitionDate
                  ? new Date(itemData.metadata.acquisitionDate)
                  : null,
                purchaseLocation: itemData.metadata.purchaseLocation ?? null,
                purchasePrice: itemData.metadata.purchasePrice
                  ? parseFloat(itemData.metadata.purchasePrice)
                  : null,
                condition: itemData.metadata.condition ?? null,
                personalRating: itemData.metadata.personalRating ?? null,
                isListened: itemData.metadata.isListened ?? false,
                isFavorite: itemData.metadata.isFavorite ?? false,
                personalNotes: itemData.metadata.personalNotes ?? null,
                vinylSpeed: itemData.metadata.vinylSpeed ?? null,
                cdType: itemData.metadata.cdType ?? null,
                cassetteType: itemData.metadata.cassetteType ?? null,
              },
            })
          }

          stats.itemsCreated++
        } catch (error) {
          stats.errors.push(`Error importing item "${itemData.title}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Import completed',
        stats,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error importing collections:', error)
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
