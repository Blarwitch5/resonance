import { betterAuth } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { db } from './db'
import { notifyNewUser } from './notify-new-user'

// Configuration better-auth pour Astro avec PostgreSQL (Neon)
// Documentation: https://www.better-auth.com/docs/installation
// https://www.better-auth.com/docs/integrations/astro

if (!import.meta.env.BETTER_AUTH_SECRET) {
  throw new Error(
    'BETTER_AUTH_SECRET must be set. Add it to your .env file (local) or Vercel environment variables (production).'
  )
}

// NOTE: Les providers OAuth nécessitent Better Auth v1.5+ ou une configuration différente
// Pour l'instant, nous désactivons les providers OAuth pour éviter les erreurs d'import
// TODO: Mettre à jour Better Auth ou utiliser une configuration alternative pour OAuth

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  secret: import.meta.env.BETTER_AUTH_SECRET,
  baseURL:
    import.meta.env.BETTER_AUTH_URL ||
    import.meta.env.PUBLIC_APP_URL ||
    import.meta.env.PUBLIC_SITE_URL ||
    (import.meta.env.PORT
      ? `http://localhost:${import.meta.env.PORT}`
      : 'http://localhost:4321'),
  basePath: '/api/auth',
  trustedOrigins: [
    import.meta.env.BETTER_AUTH_URL,
    import.meta.env.PUBLIC_APP_URL,
    import.meta.env.PUBLIC_SITE_URL,
    'http://localhost:4321',
    'http://localhost:4322',
  ].filter(Boolean) as string[],
  hooks: {
    after: createAuthMiddleware(async (context) => {
      if (context.path.startsWith('sign-up')) {
        const newSession = context.context.newSession
        if (newSession?.user) {
          const user = newSession.user
          context.context.runInBackground(
            notifyNewUser({
              email: user.email ?? '',
              name: user.name ?? null,
              createdAt: new Date().toISOString(),
            })
          )
        }
      }
    }),
  },
})

export type Session = typeof auth.$Infer.Session
