import { safeErrorMessage } from '../../../../lib/api-error'
import type { APIRoute } from 'astro'
import crypto from 'crypto'
import { db } from '../../../../../lib/db'

export const prerender = false

/**
 * Endpoint callback OAuth
 * GET/POST /api/auth/oauth/[provider]/callback
 * 
 * Reçoit le code d'autorisation du provider et crée une session Better Auth
 */
export const GET: APIRoute = async ({ params, url, request }) => {
  return handleCallback(params.provider, url, request)
}

export const POST: APIRoute = async ({ params, request }) => {
  // Certains providers peuvent utiliser POST pour le callback
  const formData = await request.formData()
  const code = formData.get('code') as string
  const state = formData.get('state') as string

  const fakeUrl = new URL(request.url)
  if (code) fakeUrl.searchParams.set('code', code)
  if (state) fakeUrl.searchParams.set('state', state)

  return handleCallback(params.provider, fakeUrl, request)
}

async function handleCallback(provider: string | undefined, url: URL, request: Request) {
  if (!provider || !['discord', 'google', 'spotify'].includes(provider)) {
    return new Response(
      JSON.stringify({ error: 'Provider invalide' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code) {
    return new Response(
      JSON.stringify({ error: 'Code d\'autorisation manquant' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Extraire le stateToken et le callbackURL depuis le state
  const [stateToken, callbackURL] = state
    ? state.split('|').map(statePart => decodeURIComponent(statePart))
    : [null, '/']

  // Vérifier le state CSRF contre le cookie oauth_state
  const cookieHeader = request.headers.get('cookie') || ''
  const oauthStateCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('oauth_state='))
    ?.split('=')[1]

  if (!stateToken || !oauthStateCookie || stateToken !== oauthStateCookie) {
    return new Response(
      JSON.stringify({ error: 'Invalid state — possible CSRF attack' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Valider callbackURL
  const safeCallback = callbackURL && callbackURL.startsWith('/') && !callbackURL.startsWith('//') ? callbackURL : '/'

  try {
    // Échanger le code contre un token d'accès
    const tokenData = await exchangeCodeForToken(provider, code)
    
    // Récupérer les informations utilisateur depuis le provider
    const userInfo = await getUserInfo(provider, tokenData.access_token)

    // Trouver ou créer l'utilisateur dans la base de données
    const user = await findOrCreateUser(provider, userInfo)

    // Créer une session Better Auth
    // Note: Better Auth gère les sessions via cookies, donc on redirige vers un endpoint qui créera la session
    const baseURL = import.meta.env.BETTER_AUTH_URL || import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321'
    
    // Créer un token temporaire pour créer la session
    const sessionToken = crypto.randomBytes(32).toString('hex')
    
    // Stocker le token temporaire avec l'ID utilisateur
    await db.verification.create({
      data: {
        identifier: user.id,
        value: sessionToken,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
    })

    // Rediriger vers un endpoint qui créera la session Better Auth
    // Utilise safeCallback (URL relative validée) au lieu du callbackURL brut
    return Response.redirect(
      `${baseURL}/api/auth/oauth/create-session?token=${sessionToken}&callback=${encodeURIComponent(safeCallback)}`,
      302
    )
  } catch (error) {
    console.error(`Error in OAuth callback for ${provider}:`, error)
    return new Response(
      JSON.stringify({
        error: 'Error during OAuth authentication',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

async function exchangeCodeForToken(provider: string, code: string): Promise<{ access_token: string }> {
  const clientId = getClientId(provider)
  const clientSecret = getClientSecret(provider)
  const baseURL = import.meta.env.BETTER_AUTH_URL || import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321'
  const redirectURI = `${baseURL}/api/auth/oauth/${provider}/callback`

  const tokenURLs = {
    discord: 'https://discord.com/api/oauth2/token',
    google: 'https://oauth2.googleapis.com/token',
    spotify: 'https://accounts.spotify.com/api/token',
  }

  const tokenURL = tokenURLs[provider as keyof typeof tokenURLs]

  // Spotify utilise Basic Auth (client_id:client_secret en base64)
  const isSpotify = provider === 'spotify'
  
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectURI,
    ...(isSpotify ? {} : {
      client_id: clientId!,
      client_secret: clientSecret!,
    }),
  })

  // Préparer les headers
  const headers: HeadersInit = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
  }

  // Spotify nécessite Basic Auth
  if (isSpotify) {
    const credentials = Buffer.from(`${clientId!}:${clientSecret!}`).toString('base64')
    headers['Authorization'] = `Basic ${credentials}`
  }

  const response = await fetch(tokenURL, {
    method: 'POST',
    headers,
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Error exchanging code: ${errorText}`)
  }

  return await response.json()
}

async function getUserInfo(provider: string, accessToken: string): Promise<{
  id: string
  email: string
  name?: string
  picture?: string
}> {
  const userInfoURLs = {
    discord: 'https://discord.com/api/users/@me',
    google: 'https://www.googleapis.com/oauth2/v2/userinfo',
    spotify: 'https://api.spotify.com/v1/me',
  }

  const userInfoURL = userInfoURLs[provider as keyof typeof userInfoURLs]

  const headers: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  }

  // Spotify nécessite un header Accept spécifique
  if (provider === 'spotify') {
    headers['Accept'] = 'application/json'
  }

  const response = await fetch(userInfoURL, { headers })

  if (!response.ok) {
    throw new Error('Error while fetching user information')
  }

  const data = await response.json()

  // Normaliser les données selon le provider
  if (provider === 'discord') {
    return {
      id: data.id,
      email: data.email || `${data.id}@discord.local`,
      name: data.username || data.global_name || data.id,
      picture: data.avatar 
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
        : undefined,
    }
  }

  if (provider === 'spotify') {
    return {
      id: data.id,
      email: data.email || `${data.id}@spotify.local`,
      name: data.display_name || data.id,
      picture: data.images && data.images.length > 0 ? data.images[0].url : undefined,
    }
  }

  if (provider === 'google') {
    return {
      id: data.id || data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
    }
  }

  throw new Error(`Provider ${provider} non supporté`)
}

async function findOrCreateUser(
  provider: string,
  userInfo: { id: string; email: string; name?: string; picture?: string }
) {
  // Chercher un compte existant avec ce provider
  const account = await db.account.findFirst({
    where: {
      providerId: provider,
      accountId: userInfo.id,
    },
    include: {
      user: true,
    },
  })

  if (account) {
    return account.user
  }

  // Chercher un utilisateur existant avec cet email
  let user = await db.user.findUnique({
    where: { email: userInfo.email },
  })

  if (!user) {
    // Créer un nouvel utilisateur
    user = await db.user.create({
      data: {
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        imageUrl: userInfo.picture || null,
        emailVerified: true,
      },
    })
  }

  // Créer le compte OAuth
  await db.account.create({
    data: {
      userId: user.id,
      providerId: provider,
      accountId: userInfo.id,
      accessToken: crypto.randomBytes(32).toString('hex'), // Stocker un token factice
    },
  })

  return user
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
