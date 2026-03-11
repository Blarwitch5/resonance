/**
 * Utility functions for loading states.
 *
 * Note: we keep SVG markup as HTML strings (injected via innerHTML) to avoid
 * recreating SVG nodes programmatically.
 */

function getSpinnerSvgMarkup(size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return `<svg class="inline-block ${sizeClasses[size]} animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`
}

export function setButtonLoading(
  button: HTMLElement,
  isLoading: boolean,
  originalText?: string
): void {
  if (!button) return

  if (isLoading) {
    if (!button.hasAttribute('data-original-html')) {
      button.setAttribute('data-original-html', button.innerHTML)
    }
    if (!button.hasAttribute('data-original-text')) {
      button.setAttribute('data-original-text', button.textContent || '')
    }
    button.setAttribute('disabled', 'true')
    button.style.cursor = 'not-allowed'
    button.style.opacity = '0.6'

    const spinnerWrap = document.createElement('span')
    spinnerWrap.className = 'mr-2 inline-flex'
    spinnerWrap.innerHTML = getSpinnerSvgMarkup('sm')
    const text = originalText || button.getAttribute('data-original-text') || 'Loading...'
    const textSpan = document.createElement('span')
    textSpan.textContent = text
    button.replaceChildren(spinnerWrap, textSpan)
  } else {
    const originalHtml = button.getAttribute('data-original-html')
    if (originalHtml) {
      button.innerHTML = originalHtml
    } else {
      const originalText = button.getAttribute('data-original-text') || ''
      button.textContent = originalText
    }
    button.removeAttribute('disabled')
    button.style.cursor = ''
    button.style.opacity = ''
  }
}

/** Returns HTML string for legacy callers; prefer setButtonLoading or createSpinnerSvgElement. */
export function createSpinner(size: 'sm' | 'md' | 'lg' = 'md'): string {
  return getSpinnerSvgMarkup(size)
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { setButtonLoading: typeof setButtonLoading }).setButtonLoading =
    setButtonLoading
  ;(window as unknown as { createSpinner: typeof createSpinner }).createSpinner = createSpinner
}
