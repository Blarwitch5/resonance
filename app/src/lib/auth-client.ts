// Client better-auth pour Astro (vanilla)
// Documentation: https://docs.astro.build/en/guides/authentication/#better-auth
import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient({
  baseURL: import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321',
  basePath: '/api/auth',
})

export const { signIn, signOut, signUp, signInWith } = authClient
