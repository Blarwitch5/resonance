/**
 * Service pour interagir avec l'API Deezer
 * Utilise l'API publique Deezer pour les previews (pas d'authentification requise)
 */

type DeezerTrack = {
  id: number
  title: string
  artist: {
    name: string
  }
  preview: string
  duration: number
  link: string
}

type DeezerSearchResponse = {
  data: DeezerTrack[]
  total: number
}

class DeezerService {
  private readonly baseUrl = 'https://api.deezer.com'

  /**
   * Vérifie si le service est disponible
   * Deezer est toujours disponible (API publique)
   */
  isConfigured(): boolean {
    return true
  }

  /**
   * Recherche une track sur Deezer
   * Format de recherche : "artist:name track:title" ou "artist track"
   */
  async searchTrack(artist: string, trackName: string): Promise<DeezerTrack | null> {
    try {
      // Format de recherche optimisé pour Deezer
      // On essaie d'abord avec "artist track" puis avec juste le track si nécessaire
      const query = `${artist} ${trackName}`.trim()
      
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=5`,
      )

      if (!response.ok) {
        console.error(`Deezer API error: ${response.status} ${response.statusText}`)
        return null
      }

      const data: DeezerSearchResponse = await response.json()

      if (!data.data || data.data.length === 0) {
        return null
      }

      // Chercher la meilleure correspondance
      // On privilégie les tracks qui matchent à la fois l'artiste et le titre
      const normalizedArtist = artist.toLowerCase().trim()
      const normalizedTrack = trackName.toLowerCase().trim()

      // Essayer de trouver une correspondance exacte
      let bestMatch = data.data.find((track) => {
        const trackArtist = track.artist.name.toLowerCase().trim()
        const trackTitle = track.title.toLowerCase().trim()
        
        return (
          trackArtist.includes(normalizedArtist) ||
          normalizedArtist.includes(trackArtist)
        ) && (
          trackTitle.includes(normalizedTrack) ||
          normalizedTrack.includes(trackTitle)
        )
      })

      // Si pas de correspondance exacte, prendre le premier résultat
      if (!bestMatch) {
        bestMatch = data.data[0]
      }

      // Vérifier qu'on a bien un preview
      if (!bestMatch.preview) {
        // Essayer les autres résultats
        const trackWithPreview = data.data.find((track) => track.preview)
        if (trackWithPreview) {
          return trackWithPreview
        }
        return null
      }

      return bestMatch
    } catch (error) {
      console.error('Error searching Deezer track:', error)
      return null
    }
  }

  /**
   * Récupère les informations d'une track par son ID
   */
  async getTrackById(trackId: number): Promise<DeezerTrack | null> {
    try {
      const response = await fetch(`${this.baseUrl}/track/${trackId}`)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        const error = await response.text()
        throw new Error(`Deezer API error: ${error}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching Deezer track:', error)
      return null
    }
  }

  /**
   * Convertit un DeezerTrack en format normalisé pour l'application
   * Compatible avec le format Spotify pour faciliter la migration
   */
  normalizeTrack(track: DeezerTrack): {
    id: string
    name: string
    artists: string[]
    preview_url: string | null
    duration_ms: number
    deezer_url: string
  } {
    return {
      id: track.id.toString(),
      name: track.title,
      artists: [track.artist.name],
      preview_url: track.preview || null,
      duration_ms: track.duration * 1000, // Deezer donne la durée en secondes
      deezer_url: track.link,
    }
  }
}

export const deezerService = new DeezerService()
