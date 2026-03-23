import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'

function initItemActionsMenu(): void {
  const wrappers = document.querySelectorAll('.item-actions-menu')

  wrappers.forEach((wrapper) => {
    if (!(wrapper instanceof HTMLElement)) return
    if (wrapper.dataset.initialized === 'true') return
    wrapper.dataset.initialized = 'true'

    const menuTrigger = wrapper.querySelector('[data-menu-trigger]')
    const menuDropdown = wrapper.querySelector('[data-menu-dropdown]')
    const favoriteButton = wrapper.querySelector('.favorite-btn')
    const removeFromCollectionButton = wrapper.querySelector('[data-action="remove-from-collection"]')
    const deleteButton = wrapper.querySelector('[data-action="delete"]')

    if (!(favoriteButton instanceof HTMLButtonElement)) return
    const itemId = favoriteButton.dataset.itemId
    if (!itemId) return

    const labels = {
      favorite: wrapper.dataset.labelFavorite || 'Favorite',
      addToFavorites: wrapper.dataset.labelAddToFavorites || 'Add to favorites',
      toastAdded: wrapper.dataset.toastAdded || 'Added to favorites',
      toastRemoved: wrapper.dataset.toastRemoved || 'Removed from favorites',
      toastUpdateError: wrapper.dataset.toastUpdateError || 'Error while updating',
      confirmRemoveCollection:
        wrapper.dataset.confirmRemoveCollection || 'Remove this album from the collection?',
      toastRemovedFromCollection:
        wrapper.dataset.toastRemovedFromCollection || 'Album removed from collection',
    }

    if (menuTrigger instanceof HTMLElement && menuDropdown instanceof HTMLElement) {
      menuTrigger.addEventListener('click', (event) => {
        event.stopPropagation()
        menuDropdown.classList.toggle('hidden')
      })

      document.addEventListener('click', (event) => {
        const target = event.target
        if (target instanceof Node && !wrapper.contains(target)) {
          menuDropdown.classList.add('hidden')
        }
      })
    }

    favoriteButton.addEventListener('click', async () => {
      const isFavorite = favoriteButton.dataset.isFavorite === 'true'
      try {
        const response = await fetch(`/api/items/${itemId}/toggle-favorite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) throw new Error('Failed to toggle favorite')

        const data = (await response.json()) as { isFavorite: boolean }
        const newIsFavorite = data.isFavorite
        favoriteButton.dataset.isFavorite = String(newIsFavorite)

        favoriteButton.querySelectorAll('svg.favorite-icon').forEach((icon) => {
          const isFilled = icon.classList.contains('fill-red-500')
          const shouldShow = newIsFavorite ? isFilled : !isFilled
          icon.classList.toggle('hidden', !shouldShow)
        })

        const label = favoriteButton.querySelector('[data-favorite-label]')
        if (label instanceof HTMLElement) {
          label.textContent = newIsFavorite ? labels.favorite : labels.addToFavorites
          label.classList.toggle('text-primary', newIsFavorite)
          label.classList.toggle('text-muted', !newIsFavorite)
        }

        window.toast?.success(newIsFavorite ? labels.toastAdded : labels.toastRemoved)
      } catch (error) {
        console.error('Error toggling favorite:', error)
        window.toast?.error(labels.toastUpdateError)
      }
    })

    if (removeFromCollectionButton instanceof HTMLButtonElement) {
      removeFromCollectionButton.addEventListener('click', async () => {
        if (!window.confirm(labels.confirmRemoveCollection)) return
        try {
          const response = await fetch(`/api/items/${itemId}/remove-from-collection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          if (!response.ok) throw new Error('Failed to remove from collection')
          window.toast?.success(labels.toastRemovedFromCollection)
          setTimeout(() => window.location.reload(), 500)
        } catch (error) {
          console.error('Error removing from collection:', error)
          window.toast?.error('Error while removing')
        }
      })
    }

    if (deleteButton instanceof HTMLButtonElement) {
      deleteButton.addEventListener('click', () => {
        const modal = document.getElementById('delete-item-modal')
        if (modal instanceof HTMLElement) {
          modal.classList.remove('hidden')
          modal.classList.add('flex')
        }
      })
    }
  })
}

onDomReady(initItemActionsMenu)
onAstroPageLoad(initItemActionsMenu)
