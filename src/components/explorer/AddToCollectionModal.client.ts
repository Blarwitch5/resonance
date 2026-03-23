import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'

type AddToCollectionLabels = Record<string, string>
type ClientMessages = Record<string, string>

type ModalMessages = {
  addToCollectionLabels: AddToCollectionLabels
  clientMessages: ClientMessages
}

function getLatestElementById(id: string): HTMLElement | null {
  const elements = Array.from(document.querySelectorAll(`#${id}`)).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  )
  return elements.at(-1) ?? null
}

function parseMessages(): ModalMessages {
  const fallback: ModalMessages = { addToCollectionLabels: {}, clientMessages: {} }
  const element = getLatestElementById('add-to-collection-modal-messages')
  if (!element?.textContent) return fallback
  try {
    const parsed = JSON.parse(element.textContent) as Partial<ModalMessages>
    return {
      addToCollectionLabels: parsed.addToCollectionLabels ?? {},
      clientMessages: parsed.clientMessages ?? {},
    }
  } catch {
    return fallback
  }
}

function getFocusableElements(modal: HTMLElement): HTMLElement[] {
  return Array.from(
    modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
  ).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      !element.hasAttribute('disabled') &&
      element.tabIndex !== -1 &&
      element.offsetParent !== null
  )
}

function initAddToCollectionModal(): void {
  const { addToCollectionLabels, clientMessages } = parseMessages()
  const modals = Array.from(document.querySelectorAll('#add-to-collection-modal')).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  )

  if (modals.length === 0) return

  modals.forEach((modal) => {
    if (modal.dataset.initialized === 'true') return
    modal.dataset.initialized = 'true'

    let lastActiveElement: HTMLElement | null = null

    const closeModal = (): void => {
      modal.classList.add('hidden')
      modal.style.display = ''
      modal.removeAttribute('data-redirect-on-success')

      if (lastActiveElement && typeof lastActiveElement.focus === 'function') lastActiveElement.focus()
      lastActiveElement = null
    }

    const closeButtons = Array.from(modal.querySelectorAll('.close-modal')).filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    )
    closeButtons.forEach((button) => button.addEventListener('click', closeModal))

    const overlay = modal.querySelector('.modal-overlay')
    if (overlay instanceof HTMLElement) overlay.addEventListener('click', closeModal)

    // Ne pas arrêter la propagation sur `.modal-content`, sinon la délégation de clic
    // enregistrée sur la modale ne reçoit jamais les clics des boutons.

    modal.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        if (!modal.classList.contains('hidden')) closeModal()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = getFocusableElements(modal)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const current = document.activeElement

      if (event.shiftKey) {
        if (current === first || !modal.contains(current)) {
          event.preventDefault()
          last.focus()
        }
      } else if (current === last || !modal.contains(current)) {
        event.preventDefault()
        first.focus()
      }
    })

    const observeOpen = new MutationObserver(() => {
      if (modal.classList.contains('hidden')) return
      if (!lastActiveElement && document.activeElement instanceof HTMLElement) {
        lastActiveElement = document.activeElement
      }
      const firstInteractive =
        modal.querySelector('.wishlist-add-btn') ||
        modal.querySelector('.collection-add-btn') ||
        modal.querySelector('button')
      if (firstInteractive instanceof HTMLElement) firstInteractive.focus()
    })
    observeOpen.observe(modal, { attributes: true, attributeFilter: ['class'] })

    async function fetchRelease(discogsId: string): Promise<any> {
      const response = await fetch(`/api/discogs/release/${discogsId}`)
      if (!response.ok) throw new Error(addToCollectionLabels.fetchReleaseError || 'Failed to fetch release')
      return response.json()
    }

    function getFormatFromRelease(release: any): 'VINYL' | 'CD' | 'CASSETTE' {
      const formatNames: string[] =
        (release.formats && Array.isArray(release.formats)
          ? release.formats.map((value: any) => String(value?.name || '').toUpperCase())
          : []) ?? []
      if (formatNames.some((name) => name.includes('CD'))) return 'CD'
      if (formatNames.some((name) => name.includes('CASSETTE'))) return 'CASSETTE'
      return 'VINYL'
    }

    function getBestCoverUrl(release: any): string | null {
      if (Array.isArray(release.images) && release.images.length > 0) {
        const primary = release.images.find((img: any) => img?.type === 'primary') ?? release.images[0]
        return primary?.uri || primary?.resource_url || null
      }
      return release.cover_image || release.thumb || null
    }

    function getBarcode(release: any): string | null {
      if (!Array.isArray(release.identifiers)) return null
      const barcode = release.identifiers.find((id: any) => id?.type === 'Barcode')
      return barcode?.value ? String(barcode.value) : null
    }

    modal.addEventListener('click', async (event: MouseEvent) => {
      const target = event.target
      // Le clic peut viser un élément SVG (svg/path) à l'intérieur du bouton.
      // `event.target` peut donc ne pas être un HTMLElement => on accepte tout Element.
      if (!(target instanceof Element)) return

      const wishlistButton = target.closest('.wishlist-add-btn')
      if (wishlistButton instanceof HTMLButtonElement) {
        event.preventDefault()
        event.stopPropagation()

        const discogsId = modal.getAttribute('data-discogs-id')
        if (!discogsId) return

        const originalText =
          wishlistButton.getAttribute('data-original-text') || addToCollectionLabels.addToWishlist || ''
        window.setButtonLoading?.(wishlistButton, true, originalText)

        try {
          const release = await fetchRelease(discogsId)
          const format = getFormatFromRelease(release)
          const primaryArtist =
            (release.artists && release.artists[0] && release.artists[0].name) || clientMessages.unknownArtist
          const year = release.year || parseInt(release.released || '0', 10) || null

          const response = await fetch('/api/wishlist/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              discogsId: release.id,
              title: release.title,
              artist: primaryArtist,
              year,
              genre: (release.genres && release.genres[0]) || (release.styles && release.styles[0]) || null,
              coverUrl: getBestCoverUrl(release),
              format,
              priority: 1,
            }),
          })

          if (response.status === 409) {
            const duplicateMessage =
              addToCollectionLabels.alreadyInWishlistToast ||
              addToCollectionLabels.failedToAddToWishlist ||
              'Already in wishlist'
            if (typeof window.toast?.info === 'function') window.toast.info(duplicateMessage)
            else window.toast?.success(duplicateMessage)
            window.dispatchEvent(
              new CustomEvent('resonance:wishlist-discogs-added', {
                detail: {
                  discogsId,
                  inWishlistAria:
                    addToCollectionLabels.inWishlistAria || 'Already in your wishlist',
                },
              }),
            )
            return
          }

          if (!response.ok) {
            const errorData = (await response.json()) as { error?: string }
            throw new Error(errorData.error || addToCollectionLabels.failedToAddToWishlist || 'Failed to add')
          }

          closeModal()
          modal.removeAttribute('data-discogs-id')
          window.toast?.success(addToCollectionLabels.addedToWishlistToast || 'Added to wishlist')
          window.dispatchEvent(
            new CustomEvent('resonance:wishlist-discogs-added', {
              detail: {
                discogsId,
                inWishlistAria:
                  addToCollectionLabels.inWishlistAria || 'Already in your wishlist',
              },
            }),
          )
        } catch (error) {
          console.error('Error adding to wishlist:', error)
          window.toast?.error(clientMessages.generalSearchError || 'Error')
        } finally {
          window.setButtonLoading?.(wishlistButton, false)
        }
        return
      }

      const collectionButton = target.closest('.collection-add-btn')
      if (collectionButton instanceof HTMLButtonElement) {
        event.preventDefault()
        event.stopPropagation()

        const collectionId = collectionButton.getAttribute('data-collection-id')
        const discogsId = modal.getAttribute('data-discogs-id')
        if (!collectionId || !discogsId) return

        const originalText =
          collectionButton.getAttribute('data-original-text') || addToCollectionLabels.add || ''
        window.setButtonLoading?.(collectionButton, true, originalText)

        try {
          const release = await fetchRelease(discogsId)
          const format = getFormatFromRelease(release)
          const primaryArtist =
            (release.artists && release.artists[0] && release.artists[0].name) || clientMessages.unknownArtist
          const year = release.year || parseInt(release.released || '0', 10) || null

          const releasePayload = {
            discogsId: release.id,
            title: release.title,
            artist: primaryArtist,
            year,
            genre: (release.genres && release.genres[0]) || (release.styles && release.styles[0]) || null,
            country: release.country || null,
            label: (release.labels && release.labels[0] && release.labels[0].name) || null,
            format,
            barcode: getBarcode(release),
            coverUrl: getBestCoverUrl(release),
          }

          const addResponse = await fetch(`/api/collections/${collectionId}/add-by-discogs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(releasePayload),
          })

          if (!addResponse.ok) {
            const errorData = (await addResponse.json()) as { error?: string }
            throw new Error(errorData.error || addToCollectionLabels.failedToAddToCollection || 'Failed to add')
          }

          const result = (await addResponse.json()) as {
            item?: { slug?: string }
            alreadyInCollection?: boolean
          }

          if (result.alreadyInCollection) {
            window.toast?.info(addToCollectionLabels.alreadyInCollectionToast || 'Already in collection')
          } else {
            window.toast?.success(addToCollectionLabels.addedToCollectionToast || 'Added')
          }

          const redirectOnSuccess = modal.getAttribute('data-redirect-on-success')
          if (redirectOnSuccess === 'true' && result.item?.slug) {
            closeModal()
            modal.removeAttribute('data-discogs-id')
            setTimeout(() => {
              window.location.href = `/items/${result.item?.slug}`
            }, 500)
          } else {
            window.setButtonLoading?.(collectionButton, false)
          }
        } catch (error) {
          console.error('Error adding to collection:', error)
          const message = error instanceof Error ? error.message : clientMessages.genericError || 'Error'
          window.toast?.error(message)
          window.setButtonLoading?.(collectionButton, false)
        }
      }
    })
  })
}

onDomReady(initAddToCollectionModal)
onAstroPageLoad(initAddToCollectionModal)

