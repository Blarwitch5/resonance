// Middleware better-auth pour Astro
// Documentation: https://docs.astro.build/en/guides/authentication/#better-auth

import { defineMiddleware } from 'astro:middleware'
import { auth } from './lib/auth'
import { db } from './lib/db'

// Routes qui nécessitent une authentification
// Utiliser des préfixes précis pour éviter de bloquer les pages publiques comme /u/[username] ou /items/[id]
const isProtectedRoute = (pathname: string): boolean => {
  // Routes exactes ou préfixes strictement privés
  const PROTECTED_EXACT = ['/feed', '/shelf', '/profile', '/settings', '/onboarding', '/notifications']
  if (PROTECTED_EXACT.some((route) => pathname === route || pathname.startsWith(route + '/'))) return true

  // /collections sans slug = liste perso, /collections/new = création
  // /collections/[slug] est public — on ne bloque pas toutes les collections
  if (pathname === '/collections' || pathname === '/collections/new') return true

  // /items/[id]/edit est privé, /items/[id] est public
  if (pathname.match(/^\/items\/[^/]+\/edit/)) return true

  return false
}

// Pages publiques qui doivent rediriger les utilisateurs déjà connectés
const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password']

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname

  // Ignorer les routes API auth pour éviter les conflits
  if (pathname.startsWith('/api/auth/')) {
    return next()
  }

  let isAuthed: Awaited<ReturnType<typeof auth.api.getSession>> = null
  try {
    isAuthed = await auth.api.getSession({
      headers: context.request.headers,
    })
  } catch (error) {
    console.error('[middleware] auth.api.getSession threw:', error)
    context.locals.user = null
    context.locals.session = null
    context.locals.userPreferences = undefined
    // Si on est sur une page protégée, rediriger vers login
    if (isProtectedRoute(pathname)) {
      return context.redirect('/login')
    }
    return next()
  }

  if (isAuthed) {
    let dbImageUrl: string | null | undefined
    let dbUsername: string | null | undefined
    try {
      const dbUser = await db.user.findUnique({
        where: { id: isAuthed.user.id },
        select: { imageUrl: true, username: true },
      })
      dbImageUrl = dbUser?.imageUrl ?? null
      dbUsername = dbUser?.username ?? null
    } catch {
      dbImageUrl = undefined
      dbUsername = undefined
    }
    context.locals.user = {
      ...isAuthed.user,
      imageUrl: dbImageUrl?.trim() || isAuthed.user.image?.trim() || null,
      username: dbUsername ?? null,
    }
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

    // Rediriger les utilisateurs connectés hors des pages d'auth
    if (AUTH_PAGES.includes(pathname)) {
      return context.redirect('/')
    }
  } else {
    context.locals.user = null
    context.locals.session = null
    context.locals.userPreferences = undefined

    // Protéger les routes qui nécessitent une connexion
    if (isProtectedRoute(pathname)) {
      const loginURL = `/login?redirectTo=${encodeURIComponent(pathname)}`
      return context.redirect(loginURL)
    }
  }

  return next()
})
