/**
 * Script client pour la barre de recherche Explorer.
 * Compilé par Vite → exécutable après view transitions.
 * Config lue depuis le script #search-bar-messages (base64 JSON).
 */

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
    failedToAddToWishlist: string
    fetchReleaseError: string
    genericError: string
  }
}

function getSearchBarMessages(): SearchBarMessages | null {
  const el = document.getElementById('search-bar-messages')
  const raw = el?.textContent?.trim()
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''))) return null
  try {
    return JSON.parse(atob(raw)) as SearchBarMessages
  } catch {
    return null
  }
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
  const filteredResults = results.results.filter((item: SearchResult) => isValidFormat(item.format))
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
          failedToAddToWishlist: addToCollectionMessages.failedToAddToWishlist,
          fetchReleaseError: addToCollectionMessages.fetchReleaseError,
          genericError: client.genericError,
        },
      }),
    })
    if (renderResponse.ok) {
      const html = await renderResponse.text()
      container.innerHTML = html
    } else {
      throw new Error(client.renderSearchResultsError)
    }
  } catch (error) {
    console.error('Error rendering search results:', error)
    if (typeof window !== 'undefined' && (window as Window & { toast?: (msg: string) => void }).toast) {
      (window as Window & { toast: (msg: string) => void }).toast(client.barcodeErrorDisplay)
    }
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
  const toast = (window as Window & { toast?: (msg: string, duration?: number) => void }).toast
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

    if (!wishlistResponse.ok) {
      const error = await wishlistResponse.json()
      throw new Error(error.error ?? addToCollectionMessages.failedToAddToWishlist)
    }
    if (toast) toast(addToCollectionMessages.addedToWishlistToast)
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    if (toast) toast(client.generalSearchError)
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
      if ((window as Window & { toast?: (msg: string) => void }).toast) {
        (window as Window & { toast: (msg: string) => void }).toast(err.error ?? client.generalSearchError)
      }
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
    if ((window as Window & { toast?: (msg: string) => void }).toast) {
      (window as Window & { toast: (msg: string) => void }).toast(client.generalSearchError)
    }
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
          if ((window as Window & { toast?: (msg: string) => void }).toast) {
            (window as Window & { toast: (msg: string) => void }).toast(messages.client.noResultsFound)
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => run(getSearchBarMessages()), { once: true })
} else {
  run(getSearchBarMessages())
}

document.addEventListener('astro:page-load', () => {
  run(getSearchBarMessages())
})
