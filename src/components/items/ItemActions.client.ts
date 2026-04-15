import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

type DeleteMessages = {
  title?: string
  description?: string
  delete?: string
  cancel?: string
}

function getDeleteMessages(): Required<DeleteMessages> {
  const fallback: Required<DeleteMessages> = {
    title: 'Delete this album?',
    description: 'Are you sure you want to delete this album? This action is irreversible.',
    delete: 'Delete',
    cancel: 'Cancel',
  }

  const element = document.getElementById('item-actions-delete-messages')
  if (!element?.textContent) return fallback
  try {
    const parsed = JSON.parse(element.textContent) as DeleteMessages
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

function animateCardRemoval(card: HTMLElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    card.remove()
    return
  }
  card.style.transition = 'all 0.3s ease'
  card.style.opacity = '0'
  card.style.transform = 'scale(0.9)'
  setTimeout(() => card.remove(), 300)
}

function initItemActions(): void {
  if (document.documentElement.dataset.itemActionsInitialized === 'true') return
  document.documentElement.dataset.itemActionsInitialized = 'true'

  const deleteMessages = getDeleteMessages()

  document.addEventListener('click', async (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return

    const button = target.closest('button[data-action]')
    if (!(button instanceof HTMLButtonElement)) return

    const action = button.getAttribute('data-action')
    const itemId = button.getAttribute('data-item-id')
    const card = button.closest('article')
    if (!itemId || !action) return

    try {
      if (action === 'favorite') {
        const response = await fetch(`/api/items/${itemId}/toggle-favorite`, { method: 'POST' })
        if (!response.ok) return

        const heartIcon = button.querySelector('svg')
        if (!(heartIcon instanceof SVGElement)) return
        heartIcon.classList.toggle('fill-red-500')
        heartIcon.classList.toggle('fill-none')
        heartIcon.classList.toggle('text-red-500')
        heartIcon.classList.toggle('stroke-red-500')
        heartIcon.classList.toggle('text-muted')
        heartIcon.classList.toggle('stroke-muted')
        return
      }

      if (action === 'delete') {
        const confirmed = await window.confirmDialog?.(
          deleteMessages.title,
          deleteMessages.description,
          deleteMessages.delete,
          deleteMessages.cancel
        )
        if (!confirmed) return

        const response = await fetch(`/api/items/${itemId}`, { method: 'DELETE' })
        if (response.ok && card instanceof HTMLElement) animateCardRemoval(card)
      }
    } catch (error) {
      console.error('Error performing action:', error)
    }
  })
}

runOnce('item-actions', () => {
  onDomReady(initItemActions)
  onAstroPageLoad(initItemActions)
})
