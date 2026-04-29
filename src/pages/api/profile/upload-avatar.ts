import { safeErrorMessage } from '../../../lib/api-error'
import type { APIRoute } from 'astro'
import { put } from '@vercel/blob'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_AVATARS_DIR = join(__dirname, '..', '..', '..', '..', 'public', 'uploads', 'avatars')

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

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
    const file = formData.get('avatar') as File | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 5MB.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const MIME_TO_EXT: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const fileExtension = MIME_TO_EXT[file.type] ?? 'jpg'
    const fileName = `avatars/${session.user.id}-${Date.now()}.${fileExtension}`

    let imageUrl: string

    if (import.meta.env.PROD) {
      const token = import.meta.env.BLOB_READ_WRITE_TOKEN
      if (!token) {
        return new Response(
          JSON.stringify({
            error: 'Avatar upload is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel.',
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        )
      }
      const blob = await put(fileName, file, { access: 'public' })
      imageUrl = blob.url
    } else {
      if (!existsSync(PUBLIC_AVATARS_DIR)) {
        await mkdir(PUBLIC_AVATARS_DIR, { recursive: true })
      }
      const filePath = join(PUBLIC_AVATARS_DIR, fileName.replace('avatars/', ''))
      const arrayBuffer = await file.arrayBuffer()
      await writeFile(filePath, Buffer.from(arrayBuffer))
      imageUrl = `/uploads/avatars/${fileName.replace('avatars/', '')}`
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { imageUrl },
    })

    return new Response(
      JSON.stringify({ success: true, imageUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error uploading avatar:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
