import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { db } from './db'

// Configuration better-auth pour Astro avec PostgreSQL (Neon)
// Documentation: https://www.better-auth.com/docs/installation
// https://www.better-auth.com/docs/integrations/astro

if (!import.meta.env.BETTER_AUTH_SECRET) {
  console.warn('⚠️  BETTER_AUTH_SECRET is not set. Please set it in your .env file.')
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
    requireEmailVerification: false,
  },
  secret:
    import.meta.env.BETTER_AUTH_SECRET ||
    'development-secret-change-in-production-minimum-32-characters',
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
})

export type Session = typeof auth.$Infer.Session
