import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

function applyTheme(): void {
  const html = document.documentElement
  const prefersDark =
    typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)').matches : false

  const theme =
    localStorage.theme === 'dark' || (!('theme' in localStorage) && prefersDark) ? 'dark' : 'light'
  html.setAttribute('data-theme', theme)
}

function updateAllIcons(): void {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    if (!(button instanceof HTMLElement)) return
    const lightIcon = button.querySelector('.theme-toggle-light-icon')
    const darkIcon = button.querySelector('.theme-toggle-dark-icon')
    if (!(lightIcon instanceof HTMLElement) || !(darkIcon instanceof HTMLElement)) return

    if (isDark) {
      lightIcon.classList.remove('hidden')
      darkIcon.classList.add('hidden')
    } else {
      darkIcon.classList.remove('hidden')
      lightIcon.classList.add('hidden')
    }
  })
}

function initThemeSwitchers(): void {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    if (!(button instanceof HTMLElement)) return
    if (button.dataset.initialized === 'true') return
    button.dataset.initialized = 'true'

    button.addEventListener('click', async (event) => {
      event.preventDefault()
      event.stopPropagation()

      const currentIsDark = document.documentElement.getAttribute('data-theme') === 'dark'
      localStorage.theme = currentIsDark ? 'light' : 'dark'

      applyTheme()
      updateAllIcons()

      document.dispatchEvent(
        new CustomEvent('themeChanged', { detail: { theme: localStorage.theme } })
      )

      try {
        await fetch('/api/profile/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ theme: localStorage.theme }),
        })
      } catch {
        // noop
      }
    })
  })

  updateAllIcons()
}

function initThemeSwitcherClient(): void {
  applyTheme()
  initThemeSwitchers()
}

runOnce('theme-switcher:themeChanged', () => {
  document.addEventListener('themeChanged', updateAllIcons)
})

onDomReady(initThemeSwitcherClient)
onAstroPageLoad(initThemeSwitcherClient)
