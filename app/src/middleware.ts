// Middleware better-auth pour Astro
// Documentation: https://docs.astro.build/en/guides/authentication/#better-auth

import { defineMiddleware } from 'astro:middleware'
import { auth } from './lib/auth'
import { db } from './lib/db'

const COOKIE_LOCALE = 'resonance-locale'
const DEFAULT_LOCALE = 'en'
const VALID_LOCALES = ['en', 'fr']

function getLocaleFromCookie(request: Request): string {
  const cookie = request.headers.get('cookie') ?? ''
  const match = cookie.match(new RegExp(`(?:^|; )${COOKIE_LOCALE}=([^;]*)`))
  const value = match ? decodeURIComponent(match[1]) : ''
  return VALID_LOCALES.includes(value) ? value : DEFAULT_LOCALE
}

export const onRequest = defineMiddleware(async (context, next) => {
  // Ignorer les routes API auth pour éviter les conflits
  if (context.url.pathname.startsWith('/api/auth/')) {
    context.locals.locale = getLocaleFromCookie(context.request)
    return next()
  }

  const isAuthed = await auth.api.getSession({
    headers: context.request.headers,
  })

  if (isAuthed) {
    context.locals.user = isAuthed.user
    context.locals.session = isAuthed.session
    try {
      const dbUser = await db.user.findUnique({
        where: { id: isAuthed.user.id },
        select: { preferredLocale: true },
      })
      const preferred = dbUser?.preferredLocale ?? null
      context.locals.locale =
        preferred && VALID_LOCALES.includes(preferred) ? preferred : getLocaleFromCookie(context.request)
    } catch {
      context.locals.locale = getLocaleFromCookie(context.request)
    }
  } else {
    context.locals.user = null
    context.locals.session = null
    context.locals.locale = getLocaleFromCookie(context.request)
  }

  // Protection de la route dashboard
  if (context.url.pathname === '/dashboard' && !isAuthed) {
    return context.redirect('/')
  }

  return next()
})