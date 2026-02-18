// Middleware better-auth pour Astro
// Documentation: https://docs.astro.build/en/guides/authentication/#better-auth

import { defineMiddleware } from 'astro:middleware'
import { auth } from './lib/auth'

export const onRequest = defineMiddleware(async (context, next) => {
  // Ignorer les routes API auth pour éviter les conflits
  if (context.url.pathname.startsWith('/api/auth/')) {
    return next()
  }

  const isAuthed = await auth.api.getSession({
    headers: context.request.headers,
  })

  if (isAuthed) {
    context.locals.user = isAuthed.user
    context.locals.session = isAuthed.session
  } else {
    context.locals.user = null
    context.locals.session = null
  }

  // Protection de la route dashboard
  if (context.url.pathname === '/dashboard' && !isAuthed) {
    return context.redirect('/')
  }

  return next()
})