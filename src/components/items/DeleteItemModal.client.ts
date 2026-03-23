import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'

type DeleteModalLabels = {
  delete: string
  deleting: string
}

type ToastLabels = {
  deleted: string
  updateError: string
}

function getMessages(): { deleteModalLabels: DeleteModalLabels; toastLabels: ToastLabels } {
  const defaults = {
    deleteModalLabels: { delete: 'Delete', deleting: 'Deleting...' },
    toastLabels: { deleted: 'Album removed from library', updateError: 'Error while updating' },
  }

  const element = document.getElementById('delete-item-modal-messages')
  if (!element) return defaults
  try {
    const parsed = JSON.parse(element.textContent || '{}') as {
      deleteModalLabels?: DeleteModalLabels
      toastLabels?: ToastLabels
    }
    return {
      deleteModalLabels: parsed.deleteModalLabels ?? defaults.deleteModalLabels,
      toastLabels: parsed.toastLabels ?? defaults.toastLabels,
    }
  } catch {
    return defaults
  }
}

function initDeleteItemModal(): void {
  const modal = document.getElementById('delete-item-modal')
  if (!(modal instanceof HTMLElement)) return
  if (modal.dataset.initialized === 'true') return
  modal.dataset.initialized = 'true'

  const closeButton = modal.querySelector('[data-action="close"]')
  const cancelButton = modal.querySelector('[data-action="cancel"]')
  const deleteButton = modal.querySelector('[data-action="confirm"]')
  if (!(deleteButton instanceof HTMLButtonElement)) return
  const itemId = deleteButton.dataset.itemId
  if (!itemId) return

  const { deleteModalLabels, toastLabels } = getMessages()
  let lastActiveElement: HTMLElement | null = null

  const closeModal = (): void => {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus()
    }
    lastActiveElement = null
  }

  const openModal = (): void => {
    modal.classList.remove('hidden')
    modal.classList.add('flex')
    lastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
    deleteButton.focus()
  }

  ;(window as Window & { openDeleteItemModal?: () => void }).openDeleteItemModal = openModal

  if (closeButton instanceof HTMLElement) closeButton.addEventListener('click', closeModal)
  if (cancelButton instanceof HTMLElement) cancelButton.addEventListener('click', closeModal)

  modal.addEventListener('click', (event: MouseEvent) => {
    if (event.target === modal) closeModal()
  })

  modal.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (!modal.classList.contains('hidden')) closeModal()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = Array.from(
      modal.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
    ).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        !element.hasAttribute('disabled') &&
        element.tabIndex !== -1 &&
        element.offsetParent !== null
    )

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

  deleteButton.addEventListener('click', async () => {
    deleteButton.disabled = true
    deleteButton.textContent = deleteModalLabels.deleting

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to delete item')

      window.toast?.success(toastLabels.deleted)
      setTimeout(() => {
        window.location.href = '/library'
      }, 500)
    } catch (error) {
      console.error('Error deleting item:', error)
      deleteButton.disabled = false
      deleteButton.textContent = deleteModalLabels.delete
      window.toast?.error(toastLabels.updateError)
    }
  })
}

onDomReady(initDeleteItemModal)
onAstroPageLoad(initDeleteItemModal)
