/**
 * Service pour interagir avec l'API Spotify
 * Utilise Client Credentials Flow pour les previews publiques
 */

type SpotifyTrack = {
  id: string
  name: string
  artists: Array<{ name: string }>
  preview_url: string | null
  duration_ms: number
  external_urls: {
    spotify: string
  }
}

type SpotifySearchResponse = {
  tracks: {
    items: SpotifyTrack[]
  }
}

class SpotifyService {
  private clientId: string | undefined
  private clientSecret: string | undefined
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor() {
    this.clientId = import.meta.env.SPOTIFY_CLIENT_ID
    this.clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET
    
    // Avertir si les credentials ne sont pas configurés (mode développement silencieux)
    if (!this.clientId || !this.clientSecret) {
      console.warn('[Spotify Service] Credentials not configured. Audio previews will be disabled.')
      console.warn('[Spotify Service] To enable: Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env')
    }
  }
  
  /**
   * Vérifie si le service est configuré
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret)
  }

  /**
   * Obtient un token d'accès via Client Credentials Flow
   */
  private async getAccessToken(): Promise<string> {
    // Si on a un token valide, le retourner
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Spotify credentials not configured')
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: 'grant_type=client_credentials',
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get Spotify access token: ${error}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    // Expire 5 minutes avant la date réelle pour être sûr
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000

    return this.accessToken
  }

  /**
   * Recherche une track sur Spotify
   */
  async searchTrack(artist: string, trackName: string): Promise<SpotifyTrack | null> {
    // Si non configuré, retourner null silencieusement
    if (!this.isConfigured()) {
      return null
    }
    
    try {
      const token = await this.getAccessToken()

      // Construire la query de recherche
      const query = `artist:${encodeURIComponent(artist)} track:${encodeURIComponent(trackName)}`
      const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Spotify API rate limit exceeded')
        }
        const error = await response.text()
        throw new Error(`Spotify API error: ${error}`)
      }

      const data: SpotifySearchResponse = await response.json()

      if (data.tracks.items.length === 0) {
        return null
      }

      return data.tracks.items[0]
    } catch (error) {
      console.error('Error searching Spotify track:', error)
      throw error
    }
  }

  /**
   * Récupère les informations d'une track par son ID
   */
  async getTrackById(trackId: string): Promise<SpotifyTrack | null> {
    // Si non configuré, retourner null silencieusement
    if (!this.isConfigured()) {
      return null
    }
    
    try {
      const token = await this.getAccessToken()

      const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        const error = await response.text()
        throw new Error(`Spotify API error: ${error}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching Spotify track:', error)
      throw error
    }
  }
}

export const spotifyService = new SpotifyService()
