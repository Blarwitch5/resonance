import { onAstroPageLoad, onDomReady } from '../scripts/client/runtime'
import { ensureExplorerWishlistHeartBridge, syncWishlistHeartsWithLabels } from '../scripts/client/explorer-wishlist-hearts'

type ExplorerPageMessages = {
  search?: {
    barcodeResultsTitleWithBarcode?: string
    barcodeNoResultsHint?: string
  }
  client?: {
    barcodeErrorDisplay?: string
    barcodeNoResults?: string
    barcodeErrorSearch?: string
  }
  addToCollection?: {
    inWishlistAria?: string
  }
}

function getExplorerMessages(): ExplorerPageMessages {
  try {
    const messagesElement = document.getElementById('explorer-page-messages')
    if (!messagesElement?.textContent) return {}
    return JSON.parse(messagesElement.textContent) as ExplorerPageMessages
  } catch (error) {
    console.warn('Could not parse explorer-page-messages', error)
    return {}
  }
}

async function initExplorerPage(): Promise<void> {
  const { search = {}, client = {}, addToCollection = {} } = getExplorerMessages()
  const searchParams = new URLSearchParams(window.location.search)
  const barcodeValue = searchParams.get('barcode')?.trim() ?? ''
  const queryValue = searchParams.get('q')?.trim() ?? ''

  if (barcodeValue) {
    const sectionElement = document.getElementById('barcode-results-section')
    const containerElement = document.getElementById('barcode-results-container')
    const titleElement = document.getElementById('barcode-results-title')
    if (titleElement) {
      titleElement.textContent = (search.barcodeResultsTitleWithBarcode ?? '').replace('{barcode}', barcodeValue)
    }
    if (!sectionElement || !containerElement) return

    sectionElement.classList.remove('hidden')
    try {
      const response = await fetch(`/api/discogs/search-by-barcode?barcode=${encodeURIComponent(barcodeValue)}`)
      const data = (await response.json()) as { found?: boolean; results?: unknown[] }
      if (data.found && Array.isArray(data.results) && data.results.length > 0) {
        const renderResponse = await fetch('/api/discogs/render-search-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results: data.results }),
        })
        if (renderResponse.ok) {
          containerElement.innerHTML = await renderResponse.text()
          ensureExplorerWishlistHeartBridge()
          void syncWishlistHeartsWithLabels({
            inWishlistAria: addToCollection.inWishlistAria ?? 'Already in your wishlist',
          })
        } else {
          const paragraphElement = document.createElement('p')
          paragraphElement.className = 'text-muted'
          paragraphElement.textContent = client.barcodeErrorDisplay ?? ''
          containerElement.replaceChildren(paragraphElement)
        }
      } else {
        const wrapperElement = document.createElement('div')
        wrapperElement.className = 'glass-card rounded-2xl border border-border/50 p-8 text-center'
        const titleParagraphElement = document.createElement('p')
        titleParagraphElement.className = 'text-lg font-medium text-neutral mb-2'
        titleParagraphElement.textContent = client.barcodeNoResults ?? ''
        const hintParagraphElement = document.createElement('p')
        hintParagraphElement.className = 'text-sm text-muted'
        hintParagraphElement.textContent = search.barcodeNoResultsHint ?? ''
        wrapperElement.appendChild(titleParagraphElement)
        wrapperElement.appendChild(hintParagraphElement)
        containerElement.replaceChildren(wrapperElement)
      }
    } catch (error) {
      console.error('Barcode search error:', error)
      const errorWrapperElement = document.createElement('div')
      errorWrapperElement.className = 'glass-card rounded-2xl border border-border/50 p-8 text-center'
      const errorParagraphElement = document.createElement('p')
      errorParagraphElement.className = 'text-muted'
      errorParagraphElement.textContent = client.barcodeErrorSearch ?? ''
      errorWrapperElement.appendChild(errorParagraphElement)
      containerElement.replaceChildren(errorWrapperElement)
    }
    return
  }

  if (queryValue) {
    window.dispatchEvent(new CustomEvent('explorer-search-from-url', { detail: { query: queryValue } }))
  }
}

onDomReady(() => {
  void initExplorerPage()
})

onAstroPageLoad(() => {
  void initExplorerPage()
})
