import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'

function initCollectionSelector(): void {
  const wrappers = document.querySelectorAll('.collection-selector-wrapper')

  wrappers.forEach((wrapper) => {
    if (!(wrapper instanceof HTMLElement)) return
    if (wrapper.dataset.initialized === 'true') return
    wrapper.dataset.initialized = 'true'

    const select = wrapper.querySelector('select[data-item-id]')
    if (!(select instanceof HTMLSelectElement)) return

    const movedTemplate =
      wrapper.dataset.toastMovedTemplate || 'Album moved to "{collectionName}"'
    const genericError =
      wrapper.dataset.toastErrorGeneric || 'Error while changing collection'

    select.addEventListener('change', async () => {
      const newCollectionId = select.value || null
      const itemId = select.dataset.itemId
      if (!itemId) return

      select.disabled = true
      const originalValue = select.value

      try {
        const response = await fetch(`/api/items/${itemId}/change-collection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionId: newCollectionId }),
        })

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string }
          throw new Error(errorData.error || genericError)
        }

        if (window.toast) {
          const collectionName = newCollectionId
            ? select.options[select.selectedIndex]?.text || 'Collection'
            : 'Uncategorized'
          window.toast.success(movedTemplate.replace('{collectionName}', collectionName))
        }

        setTimeout(() => window.location.reload(), 500)
      } catch (error) {
        console.error('Error changing collection:', error)
        select.value = originalValue
        const errorMessage = error instanceof Error ? error.message : genericError
        window.toast?.error(errorMessage)
      } finally {
        select.disabled = false
      }
    })
  })
}

onDomReady(initCollectionSelector)
onAstroPageLoad(initCollectionSelector)
