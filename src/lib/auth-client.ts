// Client better-auth pour Astro (vanilla)
// Documentation: https://docs.astro.build/en/guides/authentication/#better-auth
import { createAuthClient } from 'better-auth/client'

// Côté navigateur : toujours utiliser l'origine de la page (évite localhost en prod).
// Côté build/SSR : env ou localhost.
const baseURL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (import.meta.env.PUBLIC_APP_URL ||
        import.meta.env.PUBLIC_SITE_URL ||
        'http://localhost:4321')

export const authClient = createAuthClient({
  baseURL,
  basePath: '/api/auth',
})

export const { signIn, signOut, signUp, signInWith } = authClient
