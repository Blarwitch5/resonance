/**
 * Synchronise l’icône cœur des cartes explorer (recherche / recommandations) avec la wishlist.
 */

export type WishlistHeartLabels = {
  inWishlistAria: string
}

let cachedDiscogsIds: Set<number> | null = null

let wishlistAddedListenerRegistered = false

const fallbackInWishlistAria = 'Already in your wishlist'

export function invalidateWishlistDiscogsIdCache(): void {
  cachedDiscogsIds = null
}

export async function fetchUserWishlistDiscogsIds(): Promise<Set<number>> {
  const response = await fetch('/api/wishlist/discogs-ids')
  if (!response.ok) return new Set()
  const data = (await response.json()) as { discogsIds?: number[] }
  return new Set(data.discogsIds ?? [])
}

export async function getWishlistDiscogsIdSet(): Promise<Set<number>> {
  if (cachedDiscogsIds) return cachedDiscogsIds
  cachedDiscogsIds = await fetchUserWishlistDiscogsIds()
  return cachedDiscogsIds
}

function applyWishlistHeartToButton(button: HTMLButtonElement, inWishlist: boolean, labels: WishlistHeartLabels): void {
  const defaultAria = button.getAttribute('data-wishlist-aria-default')
  const svg = button.querySelector('svg')
  if (inWishlist) {
    button.setAttribute('data-in-wishlist', 'true')
    button.setAttribute('aria-label', labels.inWishlistAria)
    button.setAttribute('aria-pressed', 'true')
    button.classList.add('wishlist-action-button--saved')
    svg?.classList.remove('fill-none')
    svg?.classList.add('fill-current')
  } else {
    button.removeAttribute('data-in-wishlist')
    if (defaultAria) button.setAttribute('aria-label', defaultAria)
    button.setAttribute('aria-pressed', 'false')
    button.classList.remove('wishlist-action-button--saved')
    svg?.classList.add('fill-none')
    svg?.classList.remove('fill-current')
  }
}

export async function syncWishlistHeartsWithLabels(labels: WishlistHeartLabels): Promise<void> {
  const ids = await getWishlistDiscogsIdSet()
  const buttons = document.querySelectorAll<HTMLButtonElement>('button[data-action="wishlist"][data-discogs-id]')
  buttons.forEach((button) => {
    const raw = button.getAttribute('data-discogs-id')
    const id = raw ? Number.parseInt(raw, 10) : Number.NaN
    if (Number.isNaN(id)) return
    applyWishlistHeartToButton(button, ids.has(id), labels)
  })
}

export function markDiscogsIdAsInWishlist(discogsId: string, labels: WishlistHeartLabels): void {
  const id = Number.parseInt(discogsId, 10)
  if (Number.isNaN(id)) return
  if (!cachedDiscogsIds) cachedDiscogsIds = new Set()
  cachedDiscogsIds.add(id)

  const selector = `button[data-action="wishlist"][data-discogs-id="${CSS.escape(discogsId)}"]`
  document.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
    applyWishlistHeartToButton(button, true, labels)
  })
}

export function markDiscogsIdAsOutOfWishlist(discogsId: string): void {
  const id = Number.parseInt(discogsId, 10)
  if (Number.isNaN(id)) return

  if (cachedDiscogsIds) cachedDiscogsIds.delete(id)

  const labels: WishlistHeartLabels = { inWishlistAria: fallbackInWishlistAria }
  const selector = `button[data-action="wishlist"][data-discogs-id="${CSS.escape(discogsId)}"]`
  document.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
    applyWishlistHeartToButton(button, false, labels)
  })
}

function registerWishlistAddedEventBridge(): void {
  if (wishlistAddedListenerRegistered) return
  wishlistAddedListenerRegistered = true
  window.addEventListener('resonance:wishlist-discogs-added', (event: Event) => {
    if (!(event instanceof CustomEvent)) return
    const detail = event.detail as { discogsId?: string; inWishlistAria?: string }
    if (!detail?.discogsId) return
    markDiscogsIdAsInWishlist(detail.discogsId, {
      inWishlistAria: detail.inWishlistAria ?? 'Already in your wishlist',
    })
  })

  window.addEventListener('resonance:wishlist-discogs-removed', (event: Event) => {
    if (!(event instanceof CustomEvent)) return
    const detail = event.detail as { discogsId?: string }
    if (!detail?.discogsId) return
    markDiscogsIdAsOutOfWishlist(detail.discogsId)
  })
}

export function ensureExplorerWishlistHeartBridge(): void {
  registerWishlistAddedEventBridge()
}
