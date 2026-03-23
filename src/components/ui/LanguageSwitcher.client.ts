import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

function setLocaleCookie(value: string): void {
  document.cookie = `locale=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
}

async function handleLocaleChange(selectElement: HTMLSelectElement): Promise<void> {
  const value = selectElement.value
  if (!value) return

  try {
    const response = await fetch('/api/profile/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ locale: value }),
    })

    if (response.ok || response.status === 401) {
      setLocaleCookie(value)
      setTimeout(() => window.location.reload(), 0)
    }
  } catch {
    // noop
  }
}

function initLanguageSwitcher(): void {
  document.addEventListener('change', (event: Event) => {
    const target = event.target
    if (
      target instanceof HTMLSelectElement &&
      (target.classList.contains('locale-select') || target.classList.contains('locale-select-compact'))
    ) {
      void handleLocaleChange(target)
    }
  })
}

runOnce('language-switcher', () => {
  onDomReady(initLanguageSwitcher)
  onAstroPageLoad(initLanguageSwitcher)
})
