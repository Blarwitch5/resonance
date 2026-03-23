import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

function initProfileTabs(): void {
  const tabList = document.getElementById('profile-tablist')
  if (!(tabList instanceof HTMLElement)) return
  if (tabList.dataset.initialized === 'true') return
  tabList.dataset.initialized = 'true'

  const tabs = Array.from(tabList.querySelectorAll('.tab-btn')).filter(
    (tab): tab is HTMLElement => tab instanceof HTMLElement
  )
  const tabContent = document.getElementById('tab-content')
  if (!(tabContent instanceof HTMLElement) || tabs.length === 0) return

  const slotElements = tabContent.querySelectorAll('[data-tab-content]')
  if (slotElements.length === 0) {
    tabContent.querySelectorAll('[slot]').forEach((slot) => {
      const slotName = slot.getAttribute('slot')
      if (slotName) slot.setAttribute('data-tab-content', slotName)
    })
  }

  const finalSlots = Array.from(tabContent.querySelectorAll('[data-tab-content]')).filter(
    (slot): slot is HTMLElement => slot instanceof HTMLElement
  )

  const showTab = (tabName: string, focusTab = false): void => {
    tabs.forEach((tab) => {
      const icon = tab.querySelector('svg')
      const isActive = tab.getAttribute('data-tab') === tabName

      tab.classList.toggle('active', isActive)
      tab.classList.toggle('border-primary', isActive)
      tab.classList.toggle('text-primary', isActive)
      tab.classList.toggle('border-transparent', !isActive)
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false')
      tab.setAttribute('tabindex', isActive ? '0' : '-1')
      if (focusTab && isActive) tab.focus()

      if (icon instanceof SVGElement) {
        icon.classList.toggle('text-primary', isActive)
        icon.classList.toggle('stroke-primary', isActive)
        icon.classList.toggle('text-muted', !isActive)
        icon.classList.toggle('stroke-muted', !isActive)
      }
    })

    finalSlots.forEach((slot) => {
      const isActive = slot.getAttribute('data-tab-content') === tabName
      slot.classList.toggle('hidden', !isActive)
      slot.classList.toggle('active', isActive)
      slot.style.display = isActive ? 'block' : 'none'
      if (isActive && tabName === 'statistics') {
        window.dispatchEvent(new CustomEvent('profile-tab-statistics-visible'))
      }
    })
  }

  const getTabFromUrl = (): string | null => {
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    if (!tabParam) return null
    const exists = tabs.some((tab) => tab.getAttribute('data-tab') === tabParam)
    return exists ? tabParam : null
  }

  const initialTab = getTabFromUrl() || tabs[0].getAttribute('data-tab')
  if (initialTab) showTab(initialTab)

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab')
      if (!tabName) return
      showTab(tabName, true)
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tabName)
      window.history.pushState({}, '', url.toString())
    })
  })

  tabList.addEventListener('keydown', (event: KeyboardEvent) => {
    const tabArray = tabs
    const currentIndex = tabArray.indexOf(document.activeElement as HTMLElement)
    if (currentIndex === -1) return

    let nextIndex = currentIndex
    switch (event.key) {
      case 'ArrowRight':
      case 'Right':
        event.preventDefault()
        nextIndex = (currentIndex + 1) % tabArray.length
        break
      case 'ArrowLeft':
      case 'Left':
        event.preventDefault()
        nextIndex = (currentIndex - 1 + tabArray.length) % tabArray.length
        break
      case 'Home':
        event.preventDefault()
        nextIndex = 0
        break
      case 'End':
        event.preventDefault()
        nextIndex = tabArray.length - 1
        break
      default:
        return
    }

    const nextTabName = tabArray[nextIndex]?.getAttribute('data-tab')
    if (!nextTabName) return
    showTab(nextTabName, true)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', nextTabName)
    window.history.pushState({}, '', url.toString())
  })
}

runOnce('profile-tabs', () => {
  onDomReady(initProfileTabs)
  onAstroPageLoad(initProfileTabs)
})
