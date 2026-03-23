/**
 * Délégation de clics pour les cartes résultat (SearchResultCard / ResultCard).
 * À charger sur les pages explorer et explorer/[slug]. Lit les labels depuis #search-result-card-messages (base64).
 */

import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'
import {
  ensureExplorerWishlistHeartBridge,
  invalidateWishlistDiscogsIdCache,
  markDiscogsIdAsInWishlist,
  markDiscogsIdAsOutOfWishlist,
  syncWishlistHeartsWithLabels,
} from '../../scripts/client/explorer-wishlist-hearts'

type SearchResultCardMessages = {
  unknownArtist: string
  addedToWishlistToast: string
  alreadyInWishlistToast?: string
  removedFromWishlistToast: string
  addedToFavoritesToast: string
  removedFromFavoritesToast: string
  favoriteRequiresCollectionToast: string
  favoriteUpdateError: string
  failedToAddToWishlist: string
  fetchReleaseError: string
  genericError: string
  inWishlistAria?: string
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

function getLatestElementById(id: string): HTMLElement | null {
  const elements = Array.from(document.querySelectorAll(`#${id}`)).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  )
  return elements.at(-1) ?? null
}

function getMessages(): SearchResultCardMessages | null {
  const el = getLatestElementById('search-result-card-messages')
  const raw = el?.textContent?.trim()
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''))) return null
  return decodeBase64Json<SearchResultCardMessages>(raw)
}

function getWishlistHeartAriaLabel(messages: SearchResultCardMessages): string {
  return messages.inWishlistAria ?? 'Already in your wishlist'
}

function markWishlistHeartUiAfterAdd(messages: SearchResultCardMessages, discogsId: string): void {
  markDiscogsIdAsInWishlist(discogsId, { inWishlistAria: getWishlistHeartAriaLabel(messages) })
}

async function setupExplorerWishlistHeartsFromPage(): Promise<void> {
  const messages = getMessages()
  if (!messages) return
  ensureExplorerWishlistHeartBridge()
  await syncWishlistHeartsWithLabels({ inWishlistAria: getWishlistHeartAriaLabel(messages) })
}

async function addToWishlist(messages: SearchResultCardMessages, discogsId: string): Promise<void> {
  const toast = (window as Window & {
    toast?: { success?: (message: string) => void; error?: (message: string) => void; info?: (message: string) => void }
  }).toast
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

    if (wishlistResponse.status === 409) {
      const duplicateMessage =
        messages.alreadyInWishlistToast ||
        'This album is already in your wishlist.'
      if (toast?.info) toast.info(duplicateMessage)
      else if (toast?.success) toast.success(duplicateMessage)
      markWishlistHeartUiAfterAdd(messages, discogsId)
      return
    }

    if (!wishlistResponse.ok) {
      const error = (await wishlistResponse.json()) as { error?: string }
      throw new Error(error.error ?? messages.failedToAddToWishlist)
    }
    if (toast?.success) toast.success(messages.addedToWishlistToast)
    markWishlistHeartUiAfterAdd(messages, discogsId)
    window.dispatchEvent(
      new CustomEvent('resonance:wishlist-discogs-added', {
        detail: {
          discogsId,
          inWishlistAria: getWishlistHeartAriaLabel(messages),
        },
      }),
    )
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    if (toast?.error) toast.error(error instanceof Error ? error.message : messages.genericError)
  }
}

async function removeFromWishlist(messages: SearchResultCardMessages, discogsId: string): Promise<void> {
  const toast = (window as Window & {
    toast?: { success?: (message: string) => void; error?: (message: string) => void; info?: (message: string) => void }
  }).toast

  try {
    const removeResponse = await fetch(`/api/wishlist/discogs/${encodeURIComponent(discogsId)}/delete`, {
      method: 'DELETE',
    })

    if (!removeResponse.ok) {
      const message =
        messages.removedFromWishlistToast || 'Album removed from your wishlist.'

      if (removeResponse.status === 404) {
        if (toast?.info) toast.info(message)
        else if (toast?.success) toast.success(message)
        markDiscogsIdAsOutOfWishlist(discogsId)
        window.dispatchEvent(
          new CustomEvent('resonance:wishlist-discogs-removed', {
            detail: { discogsId },
          }),
        )
        return
      }

      throw new Error(messages.genericError)
    }

    if (toast?.success) toast.success(messages.removedFromWishlistToast)
    markDiscogsIdAsOutOfWishlist(discogsId)
    window.dispatchEvent(
      new CustomEvent('resonance:wishlist-discogs-removed', {
        detail: { discogsId },
      }),
    )
  } catch (error) {
    console.error('Error removing from wishlist:', error)
    if (toast?.error) toast.error(error instanceof Error ? error.message : messages.genericError)
  }
}

async function toggleFavoriteFromExplorer(
  messages: SearchResultCardMessages,
  discogsId: string,
  favoriteButton: HTMLButtonElement,
): Promise<void> {
  const toast = (window as Window & {
    toast?: {
      success?: (message: string) => void
      error?: (message: string) => void
      info?: (message: string) => void
    }
  }).toast

  try {
    const checkResponse = await fetch(`/api/items/check-by-discogs/${encodeURIComponent(discogsId)}`)
    if (!checkResponse.ok) throw new Error(messages.favoriteUpdateError)

    const checkData = (await checkResponse.json()) as { exists?: boolean; itemId?: string | null }
    let itemId = checkData.itemId

    // Si l'album n'existe pas encore côté utilisateur, on l'ajoute à la bibliothèque (non classé)
    // pour pouvoir ensuite toggler le favori sans ouvrir la modale.
    if (!checkData.exists || !itemId) {
      const addResponse = await fetch(`/api/explorer/${encodeURIComponent(discogsId)}/add-to-collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId: null, format: 'VINYL' }),
      })

      if (!addResponse.ok) throw new Error(messages.favoriteUpdateError)

      const addData = (await addResponse.json()) as { item?: { id?: string } }
      itemId = addData.item?.id ?? null
      if (!itemId) throw new Error(messages.favoriteUpdateError)
    }

    const toggleResponse = await fetch(`/api/items/${encodeURIComponent(itemId)}/toggle-favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!toggleResponse.ok) throw new Error(messages.favoriteUpdateError)

    const toggleData = (await toggleResponse.json()) as { isFavorite: boolean }
    const isFavorite = toggleData.isFavorite

    favoriteButton.setAttribute('data-in-favorite', String(isFavorite))
    favoriteButton.setAttribute('aria-pressed', isFavorite ? 'true' : 'false')
    favoriteButton.classList.toggle('favorite-action-button--saved', isFavorite)

    const svg = favoriteButton.querySelector('svg')
    if (svg instanceof SVGElement) {
      svg.classList.toggle('fill-current', isFavorite)
      svg.classList.toggle('fill-none', !isFavorite)
    }

    if (toast?.success) {
      toast.success(isFavorite ? messages.addedToFavoritesToast : messages.removedFromFavoritesToast)
    }
  } catch (error) {
    console.error('Error toggling favorites from explorer:', error)
    if (toast?.error) toast.error(messages.favoriteUpdateError)
  }
}

function resolveActionButton(event: Event): HTMLButtonElement | null {
  const node = event.target
  if (!(node instanceof Element)) return null
  const candidate = node.closest('button[data-discogs-id]')
  return candidate instanceof HTMLButtonElement ? candidate : null
}

function getFallbackMissingMessages(): string {
  if (typeof document === 'undefined') return 'Please refresh the page and try again.'
  const language = document.documentElement.lang?.toLowerCase() ?? ''
  return language.startsWith('fr')
    ? 'Rechargez la page ou réessayez.'
    : 'Please refresh the page and try again.'
}

function run(): void {
  document.addEventListener(
    'pointerdown',
    (event: Event) => {
      const target = resolveActionButton(event)
      if (!target) return
      event.preventDefault()
      event.stopPropagation()
    },
    true,
  )

  document.addEventListener(
    'click',
    async (event: Event) => {
      const target = resolveActionButton(event)
      if (!target) return

      // Toujours bloquer le lien parent <a> (boutons dans une carte cliquable).
      event.preventDefault()
      event.stopPropagation()

      const messages = getMessages()
      const toast = (window as Window & {
        toast?: {
          success?: (message: string) => void
          error?: (message: string) => void
          info?: (message: string) => void
        }
      }).toast
      if (!messages) {
        console.warn('SearchResultCard: missing #search-result-card-messages')
        if (toast?.error) toast.error(getFallbackMissingMessages())
        return
      }

      const discogsId = target.getAttribute('data-discogs-id')
      const action = target.getAttribute('data-action')
      if (!discogsId) return
      if (action === 'menu') {
        const menuWrapper = target.closest('.mobile-card-menu')
        const panel = menuWrapper?.querySelector('.mobile-card-menu-panel')
        const menuTrigger = menuWrapper?.querySelector('.mobile-card-menu-trigger')
        if (!(panel instanceof HTMLElement)) return

        document.querySelectorAll<HTMLElement>('.mobile-card-menu-panel').forEach((menuPanel) => {
          if (menuPanel !== panel) menuPanel.classList.remove('is-open')
        })
        document.querySelectorAll<HTMLElement>('.mobile-card-menu-trigger').forEach((trigger) => {
          if (trigger !== menuTrigger) {
            trigger.classList.remove('is-open')
            trigger.setAttribute('aria-expanded', 'false')
          }
        })
        panel.classList.toggle('is-open')
        if (menuTrigger instanceof HTMLElement) {
          const isOpen = panel.classList.contains('is-open')
          menuTrigger.classList.toggle('is-open', isOpen)
          menuTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
        }
      } else if (action === 'collection') {
        document.querySelectorAll<HTMLElement>('.mobile-card-menu-panel').forEach((menuPanel) => {
          menuPanel.classList.remove('is-open')
        })
        document.querySelectorAll<HTMLElement>('.mobile-card-menu-trigger').forEach((trigger) => {
          trigger.classList.remove('is-open')
          trigger.setAttribute('aria-expanded', 'false')
        })

        const modal = getLatestElementById('add-to-collection-modal')
        if (modal) {
          modal.setAttribute('data-discogs-id', discogsId)
          const shouldRedirectOnSuccess = target.getAttribute('data-redirect-on-success')
          if (shouldRedirectOnSuccess === 'true') modal.setAttribute('data-redirect-on-success', 'true')
          else modal.removeAttribute('data-redirect-on-success')
          modal.classList.remove('hidden')
          ;(modal as HTMLElement).style.display = 'flex'
        }
      } else if (action === 'favorite') {
        document.querySelectorAll<HTMLElement>('.mobile-card-menu-panel').forEach((menuPanel) => {
          menuPanel.classList.remove('is-open')
        })
        document.querySelectorAll<HTMLElement>('.mobile-card-menu-trigger').forEach((trigger) => {
          trigger.classList.remove('is-open')
          trigger.setAttribute('aria-expanded', 'false')
        })

        if (target.getAttribute('data-favorite-in-flight') === 'true') return

        target.setAttribute('data-favorite-in-flight', 'true')
        try {
          await toggleFavoriteFromExplorer(messages, discogsId, target)
        } finally {
          target.removeAttribute('data-favorite-in-flight')
        }
      } else if (action === 'wishlist') {
        document.querySelectorAll<HTMLElement>('.mobile-card-menu-panel').forEach((menuPanel) => {
          menuPanel.classList.remove('is-open')
        })
        document.querySelectorAll<HTMLElement>('.mobile-card-menu-trigger').forEach((trigger) => {
          trigger.classList.remove('is-open')
          trigger.setAttribute('aria-expanded', 'false')
        })

        const isInWishlist = target.getAttribute('data-in-wishlist') === 'true'
        if (target.getAttribute('data-wishlist-in-flight') === 'true') return

        target.setAttribute('data-wishlist-in-flight', 'true')
        try {
          if (isInWishlist) await removeFromWishlist(messages, discogsId)
          else await addToWishlist(messages, discogsId)
        } finally {
          target.removeAttribute('data-wishlist-in-flight')
        }
      }
    },
    true,
  )

  document.addEventListener(
    'click',
    (event: Event) => {
      const node = event.target
      if (!(node instanceof Element)) return
      if (node.closest('.mobile-card-menu')) return
      document.querySelectorAll<HTMLElement>('.mobile-card-menu-panel').forEach((menuPanel) => {
        menuPanel.classList.remove('is-open')
      })
      document.querySelectorAll<HTMLElement>('.mobile-card-menu-trigger').forEach((trigger) => {
        trigger.classList.remove('is-open')
        trigger.setAttribute('aria-expanded', 'false')
      })
    },
    true,
  )
}

function initSearchResultCard(): void {
  runOnce('search-result-card-click-delegation', run)
}

onDomReady(() => {
  initSearchResultCard()
})

onAstroPageLoad(() => {
  initSearchResultCard()
  invalidateWishlistDiscogsIdCache()
  void setupExplorerWishlistHeartsFromPage()
})
