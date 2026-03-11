import type { APIRoute } from 'astro'
import { db } from '../../../../lib/db'
import crypto from 'node:crypto'

export const prerender = false

/**
 * Endpoint pour initier le flux OAuth
 * GET /api/auth/oauth/[provider]
 * 
 * Redirige l'utilisateur vers le provider OAuth (Discord, Google, Spotify)
 */
export const GET: APIRoute = async ({ params, url, request }) => {
  const provider = params.provider
  const callbackURL = url.searchParams.get('callbackURL') || '/'

  if (!provider || !['discord', 'google', 'spotify'].includes(provider)) {
    return new Response(
      JSON.stringify({ error: 'Provider invalide' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Récupérer les credentials depuis les variables d'environnement
  const clientId = getClientId(provider)
  const clientSecret = getClientSecret(provider)

  // Si les credentials ne sont pas configurés, on redirige vers la page de login avec un message
  // Vérifier si c'est une requête AJAX (via header Accept ou X-Requested-With)
  const isAjaxRequest = request.headers.get('Accept')?.includes('application/json') || 
                        request.headers.get('X-Requested-With') === 'XMLHttpRequest'
  
  if (!clientId || !clientSecret) {
    const baseURL = import.meta.env.BETTER_AUTH_URL || import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321'
    
    // Si c'est une requête AJAX, retourner du JSON, sinon rediriger
    if (isAjaxRequest) {
      return new Response(
        JSON.stringify({ 
          error: `Provider ${provider} is not configured. Add credentials in .env`,
          redirect: `${baseURL}/login?error=oauth_not_configured`
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    return Response.redirect(`${baseURL}/login?error=oauth_not_configured`, 302)
  }

  // Générer un state pour la sécurité CSRF
  const state = crypto.randomBytes(32).toString('hex')
  const baseURL = import.meta.env.BETTER_AUTH_URL || import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321'
  const redirectURI = `${baseURL}/api/auth/oauth/${provider}/callback`

  // Stocker le state dans la session (via cookie ou base de données)
  // Pour simplifier, on le passe dans l'URL et on le vérifie au callback
  const authURL = getAuthURL(provider, clientId, redirectURI, state, callbackURL)

  // Rediriger vers le provider OAuth
  return Response.redirect(authURL, 302)
}

function getClientId(provider: string): string | undefined {
  switch (provider) {
    case 'discord':
      return import.meta.env.DISCORD_CLIENT_ID
    case 'google':
      return import.meta.env.GOOGLE_CLIENT_ID
    case 'spotify':
      return import.meta.env.SPOTIFY_CLIENT_ID
    default:
      return undefined
  }
}

function getClientSecret(provider: string): string | undefined {
  switch (provider) {
    case 'discord':
      return import.meta.env.DISCORD_CLIENT_SECRET
    case 'google':
      return import.meta.env.GOOGLE_CLIENT_SECRET
    case 'spotify':
      return import.meta.env.SPOTIFY_CLIENT_SECRET
    default:
      return undefined
  }
}

function getAuthURL(
  provider: string,
  clientId: string,
  redirectURI: string,
  state: string,
  callbackURL: string
): string {
  const baseURLs = {
    discord: 'https://discord.com/api/oauth2/authorize',
    google: 'https://accounts.google.com/o/oauth2/v2/auth',
    spotify: 'https://accounts.spotify.com/authorize',
  }

  const scopes = {
    discord: 'identify email',
    google: 'openid email profile',
    spotify: 'user-read-email user-read-private',
  }

  const baseURL = baseURLs[provider as keyof typeof baseURLs]
  const scope = scopes[provider as keyof typeof scopes]

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectURI,
    response_type: 'code',
    scope: scope,
    state: `${state}|${encodeURIComponent(callbackURL)}`,
  })

  return `${baseURL}?${params.toString()}`
}
