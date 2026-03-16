import type { Format } from '@prisma/client'

type DiscogsSearchResult = {
  pagination: {
    page: number
    pages: number
    per_page: number
    items: number
    urls: {
      next?: string
      prev?: string
    }
  }
  results: Array<{
    id: number
    type: string
    master_id?: number
    master_url?: string
    uri: string
    thumb: string
    cover_image: string
    resource_url: string
    title: string
    year?: number
    format?: string[]
    label?: string[]
    genre?: string[]
    style?: string[]
    country?: string
    catno?: string
    barcode?: string[]
  }>
}

type DiscogsReleaseResult = {
  id: number
  status: string
  year: number
  resource_url: string
  uri: string
  artists: Array<{
    name: string
    anv?: string
    join?: string
    role?: string
    tracks?: string
    id: number
    resource_url: string
  }>
  artists_sort: string
  labels: Array<{
    name: string
    catno: string
    entity_type: string
    entity_type_name: string
    id: number
    resource_url: string
  }>
  series: unknown[]
  companies: unknown[]
  formats: Array<{
    name: string
    qty: string
    text?: string
    descriptions?: string[]
  }>
  data_quality: string
  community: {
    want: number
    have: number
    rating: {
      count: number
      average: number
    }
    submitter?: {
      username: string
      resource_url: string
    }
    contributors: Array<{
      username: string
      resource_url: string
    }>
    data_quality: string
    status: string
  }
  format_quantity: number
  date_added: string
  date_changed: string
  num_for_sale: number
  lowest_price: number
  master_id: number
  master_url: string
  title: string
  country: string
  released?: string
  notes?: string
  released_formatted?: string
  identifiers: Array<{
    type: string
    value: string
    description?: string
  }>
  videos: Array<{
    uri: string
    title: string
    description: string
    duration: number
    embed: boolean
  }>
  genres: string[]
  styles: string[]
  tracklist: Array<{
    position: string
    type_: string
    title: string
    duration?: string
  }>
  extraartists: unknown[]
  thumb: string
  cover_image: string
  estimated_weight?: number
  images?: Array<{
    type: string
    uri: string
    resource_url: string
    uri150: string
    width: number
    height: number
  }>
}

type CacheEntry<T> = {
  data: T
  timestamp: number
  ttl: number
}

export class DiscogsService {
  private baseUrl = 'https://api.discogs.com'
  private consumerKey: string
  private consumerSecret: string
  private cache = new Map<string, CacheEntry<unknown>>()

  constructor() {
    this.consumerKey = import.meta.env.DISCOGS_CONSUMER_KEY || ''
    this.consumerSecret = import.meta.env.DISCOGS_CONSUMER_SECRET || ''

    if (!this.consumerKey || !this.consumerSecret) {
      console.warn('⚠️  Discogs API keys not configured')
    }
  }

  private getCacheKey(endpoint: string, params?: Record<string, string>): string {
    const paramString = params
      ? Object.entries(params)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}=${value}`)
          .join('&')
      : ''
    return `${endpoint}${paramString ? `?${paramString}` : ''}`
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  private setCache<T>(key: string, data: T, ttl = 300000): void {
    // TTL par défaut : 5 minutes (300000ms)
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  private clearExpiredCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private async fetchDiscogs(
    endpoint: string,
    params?: Record<string, string>,
    retries = 2,
    useCache = true,
    cacheTtl?: number,
  ) {
    // Nettoyer le cache expiré périodiquement
    if (this.cache.size > 100) {
      this.clearExpiredCache()
    }

    const cacheKey = this.getCacheKey(endpoint, params)

    // Vérifier le cache si activé
    if (useCache) {
      const cached = this.getFromCache<unknown>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const url = new URL(`${this.baseUrl}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    // Ajouter les credentials si disponibles (pour certaines endpoints)
    if (this.consumerKey && this.consumerSecret) {
      url.searchParams.append('key', this.consumerKey)
      url.searchParams.append('secret', this.consumerSecret)
    }

    const headers: HeadersInit = {
      'User-Agent': 'Resonance/1.0 +http://resonance.app',
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Ajouter un délai entre les tentatives (exponential backoff)
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        const response = await fetch(url.toString(), { headers })

        if (response.status === 401 && attempt < retries) {
          // Si 401, attendre un peu plus et réessayer
          console.warn(`Discogs API 401, retrying... (attempt ${attempt + 1}/${retries + 1})`)
          continue
        }

        if (!response.ok) {
          // 404 / 4xx : ne pas réessayer
          if (response.status === 404 || (response.status >= 400 && response.status < 500)) {
            const error = new Error(`Discogs API error: ${response.status} ${response.statusText}`) as Error & { statusCode?: number }
            error.statusCode = response.status
            throw error
          }
          // Rate limiting (429) : attendre et réessayer
          if (response.status === 429 && attempt < retries) {
            const retryAfter = response.headers.get('Retry-After')
            const delay = retryAfter ? Number.parseInt(retryAfter) * 1000 : 2000
            console.warn(`Discogs API rate limited, waiting ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          throw new Error(`Discogs API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // Mettre en cache si activé
        if (useCache) {
          this.setCache(cacheKey, data, cacheTtl)
        }

        return data
      } catch (error) {
        const err = error as Error & { statusCode?: number }
        // 404 / 4xx : ne pas réessayer, relancer tel quel
        if (err.statusCode === 404 || (err.statusCode != null && err.statusCode >= 400 && err.statusCode < 500)) {
          throw error
        }
        if (attempt === retries) {
          console.error('Error fetching from Discogs:', error)
          throw error
        }
        console.warn(`Discogs API error, retrying... (attempt ${attempt + 1}/${retries + 1})`)
      }
    }

    throw new Error('Failed to fetch from Discogs after retries')
  }

  async search(query: string, format?: Format, page = 1, perPage = 24) {
    const params: Record<string, string> = {
      q: query,
      page: page.toString(),
      per_page: perPage.toString(),
    }

    if (format) {
      params.type = 'release'
      const formatMap: Record<Format, string> = {
        VINYL: 'Vinyl',
        CD: 'CD',
        CASSETTE: 'Cassette',
      }
      params.format = formatMap[format]
    }

    const results: DiscogsSearchResult = await this.fetchDiscogs(
      '/database/search',
      params,
      2,
      true,
      300000,
    )
    return results
  }

  /**
   * Recherche Discogs par code-barres uniquement (paramètre barcode de l’API).
   * Ne mélange pas avec la recherche texte (q).
   */
  async searchByBarcode(barcode: string, page = 1, perPage = 10) {
    const normalized = barcode.trim().replace(/\s+/g, ' ')
    const params: Record<string, string> = {
      barcode: normalized,
      type: 'release',
      page: page.toString(),
      per_page: perPage.toString(),
    }
    const results: DiscogsSearchResult = await this.fetchDiscogs(
      '/database/search',
      params,
      2,
      true,
      300000,
    )
    return results
  }

  async getRelease(id: number) {
    // Cache de 1 heure pour les releases (données plus stables)
    const release: DiscogsReleaseResult = await this.fetchDiscogs(
      `/releases/${id}`,
      undefined,
      2,
      true,
      3600000,
    )
    return release
  }

  async getRecommendations(genres: string[] = [], limit = 10) {
    try {
      if (genres.length === 0) {
        // Retourner des albums populaires sans contrainte de genre
        // Utiliser des termes de recherche populaires pour éviter les recherches vides
        const popularTerms = ['rock', 'jazz', 'electronic', 'pop', 'classical']
        const randomTerm = popularTerms[Math.floor(Math.random() * popularTerms.length)]
        const results = await this.search(randomTerm, undefined, 1, limit)
        const onlyReleases = (results.results || []).filter((item) => item.type === 'release')
        return onlyReleases
      }

      // Rechercher des albums dans les genres de l'utilisateur
      const genreQueries = await Promise.all(
        genres.slice(0, 3).map(async (genre) => {
          try {
            const results = await this.search(genre, undefined, 1, Math.ceil(limit / genres.length))
            const onlyReleases = (results.results || []).filter((item) => item.type === 'release')
            return onlyReleases
          } catch (error) {
            console.warn(`Error searching for genre "${genre}":`, error)
            return []
          }
        }),
      )

      // Mélanger les résultats
      const allResults = genreQueries.flat().filter(Boolean)
      if (allResults.length === 0) {
        // Fallback si aucune recommandation trouvée
        return []
      }

      const shuffled = allResults.sort(() => Math.random() - 0.5)
      return shuffled.slice(0, limit)
    } catch (error) {
      console.error('Error getting recommendations:', error)
      return []
    }
  }

  mapDiscogsReleaseToItem(release: DiscogsReleaseResult, userId: string, format: Format) {
    // Déterminer le format principal
    const primaryArtist = release.artists[0]?.name || 'Unknown Artist'
    const yearParsed = parseInt(release.released || '0', 10)
    const year = release.year || (Number.isNaN(yearParsed) ? 0 : yearParsed)

    // Préférer les images haute résolution du tableau images, sinon cover_image, sinon thumb
    const getBestCoverUrl = () => {
      if (release.images && release.images.length > 0) {
        // Chercher l'image principale (type "primary" ou la première)
        const primaryImage = release.images.find((img) => img.type === 'primary') || release.images[0]
        return primaryImage.uri || primaryImage.resource_url || null
      }
      return release.cover_image || release.thumb || null
    }

    return {
      discogsId: release.id,
      title: release.title,
      artist: primaryArtist,
      year,
      genre: release.genres?.[0] || release.styles?.[0] || null,
      country: release.country || null,
      label: release.labels?.[0]?.name || null,
      format,
      barcode: release.identifiers?.find((id) => id.type === 'Barcode')?.value || null,
      coverUrl: getBestCoverUrl(),
      userId,
    }
  }

  mapDiscogsResultToItem(result: DiscogsSearchResult['results'][0], userId: string, format: Format) {
    const title = result.title || 'Unknown Title'
    const [artist, ...titleParts] = title.split(' - ')
    const albumTitle = titleParts.join(' - ') || title

    return {
      discogsId: result.id,
      title: albumTitle,
      artist: artist || 'Unknown Artist',
      year: result.year || null,
      genre: result.genre?.[0] || result.style?.[0] || null,
      country: result.country || null,
      label: result.label?.[0] || null,
      format,
      coverUrl: result.cover_image || result.thumb || null,
      userId,
    }
  }
}

export const discogsService = new DiscogsService()

