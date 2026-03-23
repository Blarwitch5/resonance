/**
 * Script client pour la barre de recherche Explorer.
 * Compilé par Vite → exécutable après view transitions.
 * Config lue depuis le script #search-bar-messages (base64 JSON).
 */

import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'
import {
  ensureExplorerWishlistHeartBridge,
  markDiscogsIdAsInWishlist,
  syncWishlistHeartsWithLabels,
} from '../../scripts/client/explorer-wishlist-hearts'

type ExplorerToast = {
  success?: (message: string, duration?: number) => void
  error?: (message: string, duration?: number) => void
  info?: (message: string, duration?: number) => void
}

function getExplorerToast(): ExplorerToast | undefined {
  return (window as Window & { toast?: ExplorerToast }).toast
}

type SearchResult = {
  id: string
  slug?: string
  title: string
  format?: string[]
  cover_image?: string
  year?: string
}

type SearchResponse = {
  results: SearchResult[]
}

type SearchBarMessages = {
  search: {
    placeholder: string
    noAlbumForBarcode: string
    noResultsFor: string
    tryAnotherCodeOrSearch: string
    tryAnotherSearch: string
  }
  client: {
    resultsCount: string
    noImage: string
    unknownArtist: string
    renderSearchResultsError: string
    barcodeErrorDisplay: string
    unknownError: string
    generalSearchError: string
    noResultsFound: string
    genericError: string
  }
  addToCollectionMessages: {
    addToCollectionAria: string
    addToWishlistAria: string
    addedToWishlistToast: string
    alreadyInWishlistToast?: string
    failedToAddToWishlist: string
    fetchReleaseError: string
    genericError: string
  }
}

function decodeBase64Json<T>(raw: string): T | null {
  try {
    const binary = atob(raw)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    const decoded = new TextDecoder('utf-8').decode(bytes)
    return JSON.parse(decoded) as T
  } catch {
    try {
      return JSON.parse(atob(raw)) as T
    } catch {
      return null
    }
  }
}

function getSearchBarMessages(): SearchBarMessages | null {
  const el = document.getElementById('search-bar-messages')
  const raw = el?.textContent?.trim()
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''))) return null
  return decodeBase64Json<SearchBarMessages>(raw)
}

function isValidFormat(formats: string[] | undefined): boolean {
  if (!formats || formats.length === 0) return false
  const normalizedFormats = formats.map((format) => format.toUpperCase())
  const validFormats = ['VINYL', 'CD', 'CASSETTE', 'LP', '12"', '7"', '45 RPM', '33 RPM', 'CASSETTE TAPE', 'COMPACT DISC']
  return normalizedFormats.some((format) =>
    validFormats.some((validFormat) => format.includes(validFormat))
  )
}

async function displaySearchResults(
  messages: SearchBarMessages,
  results: SearchResponse,
  searchQuery?: string
): Promise<void> {
  const container = document.getElementById('search-results-container')
  if (!container) return

  const { search, client, addToCollectionMessages } = messages
  const formatButton = document.querySelector<HTMLElement>('.format-filter-btn.active[data-format]')
  const formatValue = formatButton?.getAttribute('data-format') ?? ''
  const activeFormat = formatValue === '' ? null : formatValue
  const filteredResults = !activeFormat
    ? results.results
    : results.results.filter((item: SearchResult) => isValidFormat(item.format))
  const query = searchQuery?.trim() ?? ''

  container.classList.remove('hidden')

  if (filteredResults.length === 0) {
    const isBarcode = /^\d{8,14}$/.test(query)
    const messageText = isBarcode
      ? search.noAlbumForBarcode.replace('{query}', query)
      : search.noResultsFor.replace('{query}', query)
    const wrapper = document.createElement('div')
    wrapper.className = 'search-no-results glass-card rounded-2xl border border-border/50 p-8 text-center'
    const p1 = document.createElement('p')
    p1.className = 'text-lg font-medium text-neutral mb-2'
    p1.textContent = messageText
    const p2 = document.createElement('p')
    p2.className = 'text-sm text-muted'
    p2.textContent = search.tryAnotherCodeOrSearch
    wrapper.appendChild(p1)
    wrapper.appendChild(p2)
    container.replaceChildren(wrapper)
    return
  }

  try {
    const renderResponse = await fetch('/api/discogs/render-search-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        results: filteredResults,
        resultsCountLabel: client.resultsCount,
        noImageLabel: client.noImage,
        unknownArtistLabel: client.unknownArtist,
        addToCollectionAria: addToCollectionMessages.addToCollectionAria,
        addToWishlistAria: addToCollectionMessages.addToWishlistAria,
        scriptLabels: {
          unknownArtist: client.unknownArtist,
          addedToWishlistToast: addToCollectionMessages.addedToWishlistToast,
          alreadyInWishlistToast: addToCollectionMessages.alreadyInWishlistToast,
          failedToAddToWishlist: addToCollectionMessages.failedToAddToWishlist,
          fetchReleaseError: addToCollectionMessages.fetchReleaseError,
          genericError: client.genericError,
        },
      }),
    })
    if (renderResponse.ok) {
      const html = await renderResponse.text()
      container.innerHTML = html
      ensureExplorerWishlistHeartBridge()
      void syncWishlistHeartsWithLabels({
        inWishlistAria: addToCollectionMessages.inWishlistAria ?? 'Already in your wishlist',
      })
    } else {
      throw new Error(client.renderSearchResultsError)
    }
  } catch (error) {
    console.error('Error rendering search results:', error)
    if (typeof window !== 'undefined') getExplorerToast()?.error?.(client.barcodeErrorDisplay)
  }
}

type DiscogsImage = { type?: string; uri?: string; resource_url?: string }
type DiscogsFormat = { name: string }
type DiscogsRelease = {
  id: string
  title: string
  formats?: DiscogsFormat[]
  artists?: Array<{ name: string }>
  year?: number
  released?: string
  images?: DiscogsImage[]
  cover_image?: string
  thumb?: string
  genres?: string[]
  styles?: string[]
}

async function addToWishlist(messages: SearchBarMessages, discogsId: string): Promise<void> {
  const { client, addToCollectionMessages } = messages
  const wishlistHeartLabels = {
    inWishlistAria: addToCollectionMessages.inWishlistAria ?? 'Already in your wishlist',
  }
  try {
    const releaseResponse = await fetch(`/api/discogs/release/${discogsId}`)
    if (!releaseResponse.ok) {
      throw new Error(addToCollectionMessages.fetchReleaseError)
    }

    const release = (await releaseResponse.json()) as DiscogsRelease

    let format: 'VINYL' | 'CD' | 'CASSETTE' = 'VINYL'
    const formatNames = release.formats?.map((f: DiscogsFormat) => f.name.toUpperCase()) ?? []
    if (formatNames.some((name: string) => name.includes('CD'))) format = 'CD'
    else if (formatNames.some((name: string) => name.includes('CASSETTE'))) format = 'CASSETTE'

    const primaryArtist = release.artists?.[0]?.name ?? client.unknownArtist
    const year = release.year ?? (parseInt(release.released ?? '0', 10) || null)

    const getBestCoverUrl = (data: DiscogsRelease): string | null => {
      if (data.images?.length) {
        const primary = data.images.find((img: DiscogsImage) => img.type === 'primary') ?? data.images[0]
        return primary.uri ?? primary.resource_url ?? null
      }
      return data.cover_image ?? data.thumb ?? null
    }

    const wishlistResponse = await fetch('/api/wishlist/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discogsId: release.id,
        title: release.title,
        artist: primaryArtist,
        year,
        genre: release.genres?.[0] ?? release.styles?.[0] ?? null,
        coverUrl: getBestCoverUrl(release),
        format,
        priority: 1,
      }),
    })

    if (wishlistResponse.status === 409) {
      const duplicateMessage =
        addToCollectionMessages.alreadyInWishlistToast ||
        'This album is already in your wishlist.'
      const toastApi = getExplorerToast()
      if (toastApi?.info) toastApi.info(duplicateMessage)
      else toastApi?.success?.(duplicateMessage)
      markDiscogsIdAsInWishlist(discogsId, wishlistHeartLabels)
      return
    }

    if (!wishlistResponse.ok) {
      const error = (await wishlistResponse.json()) as { error?: string }
      throw new Error(error.error ?? addToCollectionMessages.failedToAddToWishlist)
    }
    getExplorerToast()?.success?.(addToCollectionMessages.addedToWishlistToast)
    markDiscogsIdAsInWishlist(discogsId, wishlistHeartLabels)
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    getExplorerToast()?.error?.(client.generalSearchError)
  }
}

async function runSearch(messages: SearchBarMessages, query: string): Promise<void> {
  const { search, client } = messages
  if (!query || query.length < 2) return
  const loaderElement = document.getElementById('search-loader')
  if (loaderElement) loaderElement.classList.remove('hidden')
  try {
    const formatButton = document.querySelector<HTMLElement>('.format-filter-btn.active[data-format]')
    const formatValue = formatButton?.getAttribute('data-format') ?? ''
    const format = formatValue === '' ? null : formatValue
    const urlParams = new URLSearchParams({ q: query })
    if (format) urlParams.set('format', format)
    const response = await fetch(`/api/discogs/search?${urlParams.toString()}`)
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: client.unknownError }))
      getExplorerToast()?.error?.(err.error ?? client.generalSearchError)
      return
    }
    const data = await response.json()
    if (data?.results && Array.isArray(data.results)) {
      await displaySearchResults(messages, data, query)
    } else {
      const container = document.getElementById('search-results-container')
      if (container) {
        container.classList.remove('hidden')
        const wrapper = document.createElement('div')
        wrapper.className = 'search-no-results glass-card rounded-2xl border border-border/50 p-8 text-center'
        const p1 = document.createElement('p')
        p1.className = 'text-lg font-medium text-neutral mb-2'
        p1.textContent = search.noResultsFor.replace('{query}', query)
        const p2 = document.createElement('p')
        p2.className = 'text-sm text-muted'
        p2.textContent = search.tryAnotherSearch
        wrapper.appendChild(p1)
        wrapper.appendChild(p2)
        container.replaceChildren(wrapper)
      }
    }
  } catch (error) {
    console.error('Error searching:', error)
    getExplorerToast()?.error?.(client.generalSearchError)
  } finally {
    if (loaderElement) loaderElement.classList.add('hidden')
  }
}

function initSearchBar(messages: SearchBarMessages): void {
  const searchInput = document.getElementById('discogs-search') as HTMLInputElement | null
  const loaderElement = document.getElementById('search-loader')

  if (!searchInput || searchInput.dataset.initialized === 'true') return
  searchInput.dataset.initialized = 'true'

  let searchTimeout: ReturnType<typeof setTimeout> | undefined

  searchInput.addEventListener('input', (event: Event) => {
    const target = event.target as HTMLInputElement | null
    if (!target) return
    const query = target.value.trim()
    clearTimeout(searchTimeout)
    if (query.length < 3) return
    searchTimeout = setTimeout(() => {
      if (loaderElement) loaderElement.classList.remove('hidden')
      const formatButton = document.querySelector<HTMLElement>('.format-filter-btn.active[data-format]')
      const formatValue = formatButton?.getAttribute('data-format') ?? ''
      const format = formatValue === '' ? null : formatValue
      const urlParams = new URLSearchParams({ q: query })
      if (format) urlParams.set('format', format)
      fetch(`/api/discogs/search?${urlParams.toString()}`)
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error('Search failed'))))
        .then((data: { results?: unknown[] }) => {
          if (data?.results && Array.isArray(data.results)) {
            return displaySearchResults(messages, data as SearchResponse, query)
          }
          const container = document.getElementById('search-results-container')
          if (container) {
            container.classList.add('hidden')
          }
          {
            const toast = getExplorerToast()
            const message = messages.client.noResultsFound
            if (toast?.info) toast.info(message)
            else toast?.error?.(message)
          }
        })
        .catch((error) => {
          console.error('Error searching:', error)
        })
        .finally(() => {
          if (loaderElement) loaderElement.classList.add('hidden')
        })
    }, 500)
  })

  window.addEventListener('explorer-search-from-url', ((event: CustomEvent<{ query: string }>) => {
    const query = event.detail?.query?.trim()
    if (query && searchInput) {
      searchInput.value = query
      runSearch(messages, query)
    }
  }) as EventListener)

  window.addEventListener('explorer-format-change', () => {
    const query = searchInput?.value?.trim() ?? ''
    if (query.length >= 2) runSearch(messages, query)
  })
}

function run(messages: SearchBarMessages | null): void {
  if (!messages) return
  initSearchBar(messages)
}

onDomReady(() => run(getSearchBarMessages()))
onAstroPageLoad(() => {
  run(getSearchBarMessages())
})
