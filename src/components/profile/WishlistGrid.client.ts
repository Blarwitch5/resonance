import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

type WishlistConfirmMessages = {
  confirmTitle?: string
  confirmMessage?: string
  confirmRemove?: string
  confirmCancel?: string
}

function getMessages(): Required<WishlistConfirmMessages> {
  const fallback: Required<WishlistConfirmMessages> = {
    confirmTitle: 'Remove from wishlist',
    confirmMessage: 'Are you sure?',
    confirmRemove: 'Remove',
    confirmCancel: 'Cancel',
  }

  const element = document.getElementById('wishlist-confirm-messages')
  if (!element?.textContent) return fallback
  try {
    const parsed = JSON.parse(element.textContent) as WishlistConfirmMessages
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

function animateRemoveCard(card: HTMLElement): void {
  card.style.transition = 'opacity 0.3s, transform 0.3s'
  card.style.opacity = '0'
  card.style.transform = 'scale(0.9)'
  setTimeout(() => {
    card.remove()
    const remainingItems = document.querySelectorAll('.glass-card')
    if (remainingItems.length === 0) window.location.reload()
  }, 300)
}

function initWishlistGrid(): void {
  const grid = document.querySelector('.wishlist-delete-btn')?.closest('div')
  if (grid instanceof HTMLElement && grid.dataset.wishlistInitialized === 'true') return
  if (grid instanceof HTMLElement) grid.dataset.wishlistInitialized = 'true'

  const messages = getMessages()

  const notifyError = (message: string): void => {
    if (window.toast?.error) window.toast.error(message)
    else if (typeof window.alert === 'function') window.alert(message)
    else console.error(message)
  }

  document.addEventListener('click', async (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('.wishlist-delete-btn')
    if (!(button instanceof HTMLButtonElement)) return

    const id = button.getAttribute('data-id')
    if (!id) return
    const discogsId = button.getAttribute('data-discogs-id')

    const confirmed =
      typeof window.confirmDialog === 'function'
        ? await window.confirmDialog(
            messages.confirmTitle,
            messages.confirmMessage,
            messages.confirmRemove,
            messages.confirmCancel,
          )
        : window.confirm(messages.confirmMessage)
    if (!confirmed) return

    try {
      const response = await fetch(`/api/wishlist/${id}/delete`, { method: 'DELETE' })
      if (response.ok) {
        const card = button.closest('.glass-card')
        if (card instanceof HTMLElement) animateRemoveCard(card)
        if (discogsId) {
          window.dispatchEvent(
            new CustomEvent('resonance:wishlist-discogs-removed', {
              detail: { discogsId },
            }),
          )
        }
        return
      }
      const errorData = await response.json().catch(() => null)
      const message =
        (errorData && typeof errorData === 'object' && ('error' in errorData) && (errorData.error as unknown)) ||
        (errorData && typeof errorData === 'object' && ('message' in errorData) && (errorData.message as unknown)) ||
        null
      notifyError(typeof message === 'string' ? message : 'Could not remove album')
    } catch (error) {
      console.error('Error deleting wishlist item:', error)
      notifyError('An error occurred while removing')
    }
  })
}

runOnce('wishlist-grid', () => {
  onDomReady(initWishlistGrid)
  onAstroPageLoad(initWishlistGrid)
})
