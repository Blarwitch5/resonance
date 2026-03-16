/**
 * Délégation de clics pour les cartes résultat (SearchResultCard / ResultCard).
 * À charger sur les pages explorer et explorer/[slug]. Lit les labels depuis #search-result-card-messages (base64).
 */

type SearchResultCardMessages = {
  unknownArtist: string
  addedToWishlistToast: string
  failedToAddToWishlist: string
  fetchReleaseError: string
  genericError: string
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

function getMessages(): SearchResultCardMessages | null {
  const el = document.getElementById('search-result-card-messages')
  const raw = el?.textContent?.trim()
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''))) return null
  try {
    return JSON.parse(atob(raw)) as SearchResultCardMessages
  } catch {
    return null
  }
}

async function addToWishlist(messages: SearchResultCardMessages, discogsId: string): Promise<void> {
  const toast = (window as Window & { toast?: { success?: (m: string) => void; error?: (m: string) => void } }).toast
  try {
    const releaseResponse = await fetch(`/api/discogs/release/${discogsId}`)
    if (!releaseResponse.ok) throw new Error(messages.fetchReleaseError)
    const release = (await releaseResponse.json()) as DiscogsRelease

    let format: 'VINYL' | 'CD' | 'CASSETTE' = 'VINYL'
    const formatNames = release.formats?.map((f: DiscogsFormat) => f.name.toUpperCase()) ?? []
    if (formatNames.some((n: string) => n.includes('CD'))) format = 'CD'
    else if (formatNames.some((n: string) => n.includes('CASSETTE'))) format = 'CASSETTE'

    const primaryArtist = release.artists?.[0]?.name ?? messages.unknownArtist
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
      throw new Error(error.error ?? messages.failedToAddToWishlist)
    }
    if (toast?.success) toast.success(messages.addedToWishlistToast)
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    if (toast?.error) toast.error(error instanceof Error ? error.message : messages.genericError)
  }
}

function run(messages: SearchResultCardMessages | null): void {
  if (!messages) return
  document.addEventListener('click', async (event: Event) => {
    const target = (event.target as HTMLElement | null)?.closest?.('button[data-discogs-id]') as HTMLButtonElement | null
    if (!target) return
    event.preventDefault()
    event.stopPropagation()
    const discogsId = target.getAttribute('data-discogs-id')
    const action = target.getAttribute('data-action')
    if (!discogsId) return
    if (action === 'collection') {
      const modal = document.getElementById('add-to-collection-modal')
      if (modal) {
        modal.setAttribute('data-discogs-id', discogsId)
        modal.classList.remove('hidden')
        ;(modal as HTMLElement).style.display = 'flex'
      }
    } else if (action === 'wishlist') {
      await addToWishlist(messages, discogsId)
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => run(getMessages()), { once: true })
} else {
  run(getMessages())
}
document.addEventListener('astro:page-load', () => run(getMessages()))
