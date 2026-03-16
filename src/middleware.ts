// Middleware better-auth pour Astro
// Documentation: https://docs.astro.build/en/guides/authentication/#better-auth

import { defineMiddleware } from 'astro:middleware'
import { auth } from './lib/auth'
import { db } from './lib/db'

export const onRequest = defineMiddleware(async (context, next) => {
  // Ignorer les routes API auth pour éviter les conflits
  if (context.url.pathname.startsWith('/api/auth/')) {
    return next()
  }

  let isAuthed: Awaited<ReturnType<typeof auth.api.getSession>> = null
  try {
    isAuthed = await auth.api.getSession({
      headers: context.request.headers,
    })
  } catch {
    context.locals.user = null
    context.locals.session = null
    context.locals.userPreferences = undefined
    return next()
  }

  if (isAuthed) {
    context.locals.user = isAuthed.user
    context.locals.session = isAuthed.session
    let prefs: { preferredTheme: string | null; preferredLocale: string | null } | null = null
    try {
      prefs = await db.user.findUnique({
        where: { id: isAuthed.user.id },
        select: { preferredTheme: true, preferredLocale: true },
      })
    } catch {
      // Colonnes preferredLocale/preferredTheme absentes en prod (migration non appliquée) : on continue sans préférences
    }
    const cookieLocale = context.cookies.get('locale')?.value
    const locale = prefs?.preferredLocale ?? cookieLocale ?? undefined
    const theme = prefs?.preferredTheme ?? undefined
    context.locals.userPreferences = {
      theme: theme ?? undefined,
      locale: locale ?? undefined,
    }
    if (locale) {
      context.cookies.set('locale', locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: import.meta.env.PROD,
        httpOnly: false,
      })
    }
  } else {
    context.locals.user = null
    context.locals.session = null
    context.locals.userPreferences = undefined
  }

  // Protection de la route dashboard
  if (context.url.pathname === '/dashboard' && !isAuthed) {
    return context.redirect('/')
  }

  return next()
})