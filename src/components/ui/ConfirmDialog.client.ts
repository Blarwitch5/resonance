type ConfirmDialogResolver = ((value: boolean) => void) | null

import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

function initConfirmDialog(): void {
  const dialog = document.getElementById('confirm-dialog')
  const title = document.getElementById('confirm-dialog-title')
  const message = document.getElementById('confirm-dialog-message')
  const cancelButton = document.getElementById('confirm-dialog-cancel')
  const confirmButton = document.getElementById('confirm-dialog-confirm')

  if (
    !(dialog instanceof HTMLElement) ||
    !(title instanceof HTMLElement) ||
    !(message instanceof HTMLElement) ||
    !(cancelButton instanceof HTMLButtonElement) ||
    !(confirmButton instanceof HTMLButtonElement)
  ) {
    return
  }

  if (dialog.dataset.initialized === 'true') return
  dialog.dataset.initialized = 'true'

  let resolvePromise: ConfirmDialogResolver = null
  let lastActiveElement: HTMLElement | null = null

  const getFocusableElements = (): HTMLElement[] => {
    const focusableSelectors = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])',
    ]

    return Array.from(dialog.querySelectorAll(focusableSelectors.join(','))).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        !element.hasAttribute('disabled') &&
        element.tabIndex !== -1 &&
        element.offsetParent !== null
    )
  }

  const hideDialog = (): void => {
    dialog.classList.add('hidden')
    dialog.classList.remove('flex')

    if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
      lastActiveElement.focus()
    }
    lastActiveElement = null
  }

  const resolveAndClose = (value: boolean): void => {
    hideDialog()
    if (resolvePromise) resolvePromise(value)
    resolvePromise = null
  }

  const showDialog = (
    dialogTitle: string,
    dialogMessage: string,
    confirmText?: string,
    cancelText?: string
  ): Promise<boolean> => {
    lastActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null

    title.textContent = dialogTitle
    message.textContent = dialogMessage
    if (confirmText) confirmButton.textContent = confirmText
    if (cancelText) cancelButton.textContent = cancelText

    dialog.classList.remove('hidden')
    dialog.classList.add('flex')
    confirmButton.focus()

    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }

  cancelButton.addEventListener('click', () => resolveAndClose(false))
  confirmButton.addEventListener('click', () => resolveAndClose(true))

  dialog.addEventListener('click', (event: MouseEvent) => {
    if (event.target === dialog) resolveAndClose(false)
  })

  dialog.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      resolveAndClose(false)
      return
    }

    if (event.key !== 'Tab') return
    const focusable = getFocusableElements()
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const firstElement = focusable[0]
    const lastElement = focusable[focusable.length - 1]
    const current = document.activeElement

    if (event.shiftKey) {
      if (current === firstElement || !dialog.contains(current)) {
        event.preventDefault()
        lastElement.focus()
      }
    } else if (current === lastElement || !dialog.contains(current)) {
      event.preventDefault()
      firstElement.focus()
    }
  })

  window.confirmDialog = showDialog
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConfirmDialog)
} else {
  initConfirmDialog()
}

runOnce('confirm-dialog', () => {
  onDomReady(initConfirmDialog)
  onAstroPageLoad(initConfirmDialog)
})
