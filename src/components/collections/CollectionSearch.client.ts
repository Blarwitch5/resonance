import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'

function getLabels(): { noResultsLabel: string; noResultsForQueryTemplate: string } {
  const fallback = {
    noResultsLabel: 'No results',
    noResultsForQueryTemplate: 'No album matches "{query}"',
  }

  const element = document.getElementById('collection-search-messages')
  if (!element?.textContent) return fallback
  try {
    const parsed = JSON.parse(element.textContent) as Partial<typeof fallback>
    return {
      noResultsLabel: parsed.noResultsLabel || fallback.noResultsLabel,
      noResultsForQueryTemplate: parsed.noResultsForQueryTemplate || fallback.noResultsForQueryTemplate,
    }
  } catch {
    return fallback
  }
}

function createSearchIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '32')
  svg.setAttribute('height', '32')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('class', 'text-primary')

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', '11')
  circle.setAttribute('cy', '11')
  circle.setAttribute('r', '8')
  svg.appendChild(circle)

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'm21 21-4.35-4.35')
  svg.appendChild(path)

  return svg
}

function initCollectionSearch(): void {
  const searchInput = document.getElementById('collection-search')
  const clearButton = document.getElementById('clear-search')
  const itemsContainer = document.querySelector('[data-items-container]')

  if (!(searchInput instanceof HTMLInputElement)) return
  if (searchInput.dataset.initialized === 'true') return
  searchInput.dataset.initialized = 'true'

  const { noResultsLabel, noResultsForQueryTemplate } = getLabels()
  const itemSections = document.querySelectorAll('[data-item-section]')
  const itemCards = document.querySelectorAll('[data-item-card]')

  function setClearVisible(isVisible: boolean): void {
    if (!(clearButton instanceof HTMLElement)) return
    clearButton.classList.toggle('hidden', !isVisible)
    clearButton.classList.toggle('flex', isVisible)
  }

  function showNoResultsMessage(query: string): void {
    if (!(itemsContainer instanceof HTMLElement)) return
    if (document.getElementById('search-results-message')) return

    const message = document.createElement('div')
    message.id = 'search-results-message'
    message.className = 'glass-card rounded-2xl p-12 text-center col-span-full'

    const iconWrap = document.createElement('div')
    iconWrap.className =
      'bg-gradient-resonance-subtle mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full'
    iconWrap.appendChild(createSearchIcon())
    message.appendChild(iconWrap)

    const heading = document.createElement('h3')
    heading.className = 'font-display mb-2 text-xl font-semibold text-neutral'
    heading.textContent = noResultsLabel
    message.appendChild(heading)

    const paragraph = document.createElement('p')
    paragraph.className = 'text-muted'
    paragraph.textContent = noResultsForQueryTemplate.replace('{query}', query)
    message.appendChild(paragraph)

    itemsContainer.appendChild(message)
  }

  function removeNoResultsMessage(): void {
    document.getElementById('search-results-message')?.remove()
  }

  function performSearch(query: string): void {
    const searchTerm = query.toLowerCase().trim()
    let visibleCount = 0

    if (searchTerm === '') {
      itemSections.forEach((section) => section.classList.remove('hidden'))
      itemCards.forEach((card) => card.classList.remove('hidden'))
      setClearVisible(false)
      removeNoResultsMessage()
      return
    }

    setClearVisible(true)

    itemCards.forEach((card) => {
      const title = (card.getAttribute('data-item-title') || '').toLowerCase()
      const artist = (card.getAttribute('data-item-artist') || '').toLowerCase()
      const genre = (card.getAttribute('data-item-genre') || '').toLowerCase()
      const year = card.getAttribute('data-item-year') || ''

      const matches =
        title.includes(searchTerm) ||
        artist.includes(searchTerm) ||
        genre.includes(searchTerm) ||
        year.includes(searchTerm)

      card.classList.toggle('hidden', !matches)
      if (matches) visibleCount += 1
    })

    itemSections.forEach((section) => {
      const visibleItems = section.querySelectorAll('[data-item-card]:not(.hidden)')
      section.classList.toggle('hidden', visibleItems.length === 0)
    })

    if (visibleCount === 0) showNoResultsMessage(query)
    else removeNoResultsMessage()
  }

  searchInput.addEventListener('input', () => performSearch(searchInput.value))

  clearButton?.addEventListener('click', () => {
    searchInput.value = ''
    performSearch('')
    searchInput.focus()
  })

  searchInput.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && searchInput.value) {
      searchInput.value = ''
      performSearch('')
    }
  })
}

onDomReady(initCollectionSearch)
onAstroPageLoad(initCollectionSearch)

