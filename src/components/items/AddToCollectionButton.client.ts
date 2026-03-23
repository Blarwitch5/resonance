import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'

type AddToCollectionLabels = {
  add: string
  adding: string
  errorAdding: string
}

type CollectionSelectorLabels = {
  label: string
  uncategorized: string
}

type AddToCollectionButtonMessages = {
  addToCollectionLabels: AddToCollectionLabels
  collectionSelectorLabels: CollectionSelectorLabels
}

function getMessages(): AddToCollectionButtonMessages {
  const fallback: AddToCollectionButtonMessages = {
    addToCollectionLabels: {
      add: 'Add',
      adding: 'Adding...',
      errorAdding: 'Error while adding',
    },
    collectionSelectorLabels: {
      label: 'Collection',
      uncategorized: 'Uncategorized',
    },
  }

  const element = document.getElementById('add-to-collection-button-messages')
  if (!element?.textContent) return fallback
  try {
    const parsed = JSON.parse(element.textContent) as Partial<AddToCollectionButtonMessages>
    return {
      addToCollectionLabels: { ...fallback.addToCollectionLabels, ...(parsed.addToCollectionLabels ?? {}) },
      collectionSelectorLabels: {
        ...fallback.collectionSelectorLabels,
        ...(parsed.collectionSelectorLabels ?? {}),
      },
    }
  } catch {
    return fallback
  }
}

function initAddToCollectionButtons(): void {
  const messages = getMessages()
  const wrappers = document.querySelectorAll('.add-to-collection-wrapper')
  if (!wrappers.length) return

  wrappers.forEach((wrapper) => {
    if (!(wrapper instanceof HTMLElement)) return
    if (wrapper.dataset.initialized === 'true') return
    wrapper.dataset.initialized = 'true'

    const discogsId = wrapper.getAttribute('data-discogs-id')
    const openButton = wrapper.querySelector('[data-action="open-modal"]')
    const modal = wrapper.querySelector('[data-modal]')
    const closeButton = wrapper.querySelector('[data-action="close"]')
    const cancelButton = wrapper.querySelector('[data-action="cancel"]')
    const confirmButton = wrapper.querySelector('[data-action="confirm"]')
    const select = discogsId ? wrapper.querySelector(`#collection-select-${discogsId}`) : null

    const openModal = (): void => {
      if (!(modal instanceof HTMLElement)) return
      modal.classList.remove('hidden')
      modal.style.display = 'flex'
    }

    const closeModal = (): void => {
      if (!(modal instanceof HTMLElement)) return
      modal.classList.add('hidden')
      modal.style.display = ''
    }

    if (openButton instanceof HTMLElement) openButton.addEventListener('click', openModal)
    if (closeButton instanceof HTMLElement) closeButton.addEventListener('click', closeModal)
    if (cancelButton instanceof HTMLElement) cancelButton.addEventListener('click', closeModal)

    if (modal instanceof HTMLElement) {
      modal.addEventListener('click', (event: MouseEvent) => {
        if (event.target === modal) closeModal()
      })
    }

    if (confirmButton instanceof HTMLButtonElement) {
      confirmButton.addEventListener('click', async () => {
        const selectedCollectionId = select instanceof HTMLSelectElement ? select.value : null
        const buttonDiscogsId = confirmButton.getAttribute('data-discogs-id')
        if (!buttonDiscogsId) return

        const originalText = confirmButton.textContent || messages.addToCollectionLabels.add
        confirmButton.disabled = true
        confirmButton.textContent = messages.addToCollectionLabels.adding

        try {
          const collectionId =
            selectedCollectionId && selectedCollectionId.trim() !== '' ? selectedCollectionId : null

          const response = await fetch(`/api/explorer/${buttonDiscogsId}/add-to-collection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectionId }),
          })

          if (!response.ok) {
            const errorData = (await response.json()) as { error?: string }
            throw new Error(errorData.error || messages.addToCollectionLabels.errorAdding)
          }

          const data = (await response.json()) as { redirectTo?: string }

          const collectionName = selectedCollectionId
            ? (select instanceof HTMLSelectElement ? select.options[select.selectedIndex]?.text : null) ||
              messages.collectionSelectorLabels.label
            : messages.collectionSelectorLabels.uncategorized

          window.toast?.success(`Album added to "${collectionName}"`)

          if (data.redirectTo) {
            setTimeout(() => {
              window.location.href = data.redirectTo as string
            }, 500)
          }
        } catch (error) {
          console.error('Error adding item:', error)
          confirmButton.disabled = false
          confirmButton.textContent = originalText
          const message = error instanceof Error ? error.message : messages.addToCollectionLabels.errorAdding
          window.toast?.error(message)
        }
      })
    }
  })
}

onDomReady(initAddToCollectionButtons)
onAstroPageLoad(initAddToCollectionButtons)

