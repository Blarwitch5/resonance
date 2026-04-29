import { safeErrorMessage } from '../../../lib/api-error'
import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'

const VALID_LOCALES = ['en', 'fr'] as const
type Locale = (typeof VALID_LOCALES)[number]

function isValidLocale(value: string): value is Locale {
  return VALID_LOCALES.includes(value as Locale)
}

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json().catch(() => ({}))
    const locale = typeof body.locale === 'string' ? body.locale.trim() : ''

    if (!isValidLocale(locale)) {
      return new Response(
        JSON.stringify({ error: 'Invalid locale. Use "en" or "fr".' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { preferredLocale: locale },
    })

    return new Response(
      JSON.stringify({ success: true, locale }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error updating locale:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
