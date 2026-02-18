/**
 * Utility functions for loading states
 */

export function setButtonLoading(button: HTMLElement, isLoading: boolean, originalText?: string): void {
  if (!button) return

  if (isLoading) {
    // Store original content
    if (!button.hasAttribute('data-original-html')) {
      button.setAttribute('data-original-html', button.innerHTML)
    }
    if (!button.hasAttribute('data-original-text')) {
      button.setAttribute('data-original-text', button.textContent || '')
    }

    // Disable button
    button.setAttribute('disabled', 'true')
    button.style.cursor = 'not-allowed'
    button.style.opacity = '0.6'

    // Add spinner
    const spinner = `
      <svg class="inline-block w-4 h-4 animate-spin mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    `
    const text = originalText || button.getAttribute('data-original-text') || 'Chargement...'
    button.innerHTML = `${spinner}${text}`
  } else {
    // Restore original content
    const originalHtml = button.getAttribute('data-original-html')
    if (originalHtml) {
      button.innerHTML = originalHtml
    } else {
      const originalText = button.getAttribute('data-original-text') || ''
      button.textContent = originalText
    }

    // Re-enable button
    button.removeAttribute('disabled')
    button.style.cursor = ''
    button.style.opacity = ''
  }
}

export function createSpinner(size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  return `
    <svg class="inline-block ${sizeClasses[size]} animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  `
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.setButtonLoading = setButtonLoading
  window.createSpinner = createSpinner
}
