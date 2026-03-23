import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

function getShortcutsHint(): string {
  const hintsElement = document.getElementById('keyboard-shortcuts-hint')
  const fallback = 'Shortcuts: ⌘K (Search), ⌘N (New), Esc (Close), →/← (Navigate)'
  if (!hintsElement) return fallback
  try {
    const parsed = JSON.parse(hintsElement.textContent || '{}') as { shortcutsHint?: string }
    return parsed.shortcutsHint || fallback
  } catch {
    return fallback
  }
}

function isEditableTarget(target: unknown): boolean {
  if (!(target instanceof Element)) return false
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true
  }
  const role = target.getAttribute('role')
  if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true
  const contentEditable = target.getAttribute('contenteditable')
  return contentEditable === '' || contentEditable === 'true'
}

function initKeyboardShortcuts(): void {
  const hint = getShortcutsHint()

  if (document.documentElement.dataset.keyboardShortcutsInitialized === 'true') return
  document.documentElement.dataset.keyboardShortcutsInitialized = 'true'

  const shortcuts = new Map<string, (event: KeyboardEvent) => void>()

  shortcuts.set('meta+k', (event) => {
    if (isEditableTarget(event.target)) return
    event.preventDefault()
    const searchInput = document.querySelector('input[type="search"], #search, .search-input')
    if (searchInput instanceof HTMLInputElement) {
      searchInput.focus()
      searchInput.select()
      return
    }
    window.location.href = '/explorer'
  })

  shortcuts.set('escape', (event) => {
    if (isEditableTarget(event.target)) return
    const modal = document.querySelector(
      '[role="dialog"][data-open="true"], [role="dialog"]:not(.hidden), .modal:not(.hidden), .popup:not(.hidden)'
    )
    if (modal instanceof HTMLElement && !modal.classList.contains('hidden')) {
      const closeButton = modal.querySelector('[aria-label*="Close"], button[data-close]')
      if (closeButton instanceof HTMLElement) closeButton.click()
      else modal.classList.add('hidden')
    }
  })

  shortcuts.set('arrowright', (event) => {
    if (isEditableTarget(event.target)) return
    const nextItem = document.querySelector('[data-item-index]:focus, .item-card:hover')
    if (!(nextItem instanceof HTMLElement)) return
    const allItems = Array.from(document.querySelectorAll('[data-item-index]')).filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    )
    const currentIndex = allItems.indexOf(nextItem)
    if (currentIndex < allItems.length - 1) {
      const next = allItems[currentIndex + 1]
      next.focus()
      next.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })

  shortcuts.set('arrowleft', (event) => {
    if (isEditableTarget(event.target)) return
    const prevItem = document.querySelector('[data-item-index]:focus, .item-card:hover')
    if (!(prevItem instanceof HTMLElement)) return
    const allItems = Array.from(document.querySelectorAll('[data-item-index]')).filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    )
    const currentIndex = allItems.indexOf(prevItem)
    if (currentIndex > 0) {
      const prev = allItems[currentIndex - 1]
      prev.focus()
      prev.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  })

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return

    const key = event.key.toLowerCase()
    const metaKey = event.metaKey || event.ctrlKey
    const combination = `${metaKey ? 'meta+' : ''}${key}`

    const handler = shortcuts.get(combination) || shortcuts.get(key)
    if (handler) handler(event)
  })

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return
    if ((event.metaKey || event.ctrlKey) && event.key === '?') {
      event.preventDefault()
      window.toast?.info(hint, 5000)
    }
  })
}

runOnce('keyboard-shortcuts', () => {
  onDomReady(initKeyboardShortcuts)
  onAstroPageLoad(initKeyboardShortcuts)
})

