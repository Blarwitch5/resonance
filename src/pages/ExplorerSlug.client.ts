import { onAstroPageLoad, onDomReady } from '../scripts/client/runtime'

function runExplorerSlugPage(): void {
  document.addEventListener('click', (event: Event) => {
    const targetElement = event.target as Element | null
    if (!targetElement) return

    const buttonElement = targetElement.closest('.open-add-modal-btn') as HTMLButtonElement | null
    if (!buttonElement) return

    const modalElement = document.getElementById('add-to-collection-modal')
    if (!modalElement) return

    event.preventDefault()

    const discogsId = buttonElement.getAttribute('data-discogs-id')
    const redirectOnSuccess = buttonElement.getAttribute('data-redirect-on-success')
    if (!discogsId) return

    modalElement.setAttribute('data-discogs-id', discogsId)
    if (redirectOnSuccess) {
      modalElement.setAttribute('data-redirect-on-success', 'true')
    } else {
      modalElement.removeAttribute('data-redirect-on-success')
    }

    modalElement.classList.remove('hidden')
    ;(modalElement as HTMLElement).style.display = 'flex'
  })
}

onDomReady(runExplorerSlugPage)
onAstroPageLoad(runExplorerSlugPage)
