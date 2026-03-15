import type { APIRoute } from 'astro'
import { auth } from '../../../lib/auth'
import { db } from '../../../lib/db'
import { locales } from '../../../i18n/config'

const THEMES = ['light', 'dark'] as const
type Theme = (typeof THEMES)[number]

function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

function isValidLocale(value: unknown): value is (typeof locales)[number] {
  return typeof value === 'string' && (locales as readonly string[]).includes(value)
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const body = await request.json().catch(() => ({}))
    const { theme, locale } = body

    const updateData: { preferredTheme?: string; preferredLocale?: string } = {}

    if (theme !== undefined) {
      if (!isValidTheme(theme)) {
        return new Response(
          JSON.stringify({ error: 'Invalid theme. Use "light" or "dark".' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      updateData.preferredTheme = theme
    }

    if (locale !== undefined) {
      if (!isValidLocale(locale)) {
        return new Response(
          JSON.stringify({ error: 'Invalid locale. Use "en" or "fr".' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      updateData.preferredLocale = locale
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No changes' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    await db.user.update({
      where: { id: session.user.id },
      data: updateData,
    })

    const responseHeaders = new Headers({ 'Content-Type': 'application/json' })
    if (updateData.preferredLocale !== undefined) {
      const maxAge = 60 * 60 * 24 * 365
      const secure = import.meta.env.PROD ? '; Secure' : ''
      responseHeaders.set('Set-Cookie', `locale=${updateData.preferredLocale}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Error updating preferences:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
