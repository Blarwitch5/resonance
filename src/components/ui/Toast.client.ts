type ToastType = 'success' | 'error' | 'info' | 'warning'
type ToastPayload = { id: string; type: ToastType; message: string; duration: number }
type ToastOptions = { type?: ToastType; message: string; duration?: number }

import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

type WindowWithToastInit = Window & {
  __resonanceToastInitialized?: boolean
}

const iconSvgByType: Record<ToastType, string> = {
  success:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  error:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
  info:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  warning:
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
}

const closeButtonSvgMarkup =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'

let toastIdCounter = 0

function getCloseAriaLabel(): string {
  const toastMessagesElement = document.getElementById('toast-messages')
  if (!toastMessagesElement) return 'Close'
  try {
    const parsed = JSON.parse(toastMessagesElement.textContent || '{}') as { closeAriaLabel?: string }
    return parsed.closeAriaLabel || 'Close'
  } catch {
    return 'Close'
  }
}

function createToastElement(toast: ToastPayload, closeAriaLabel: string): HTMLDivElement {
  const toastElement = document.createElement('div')
  toastElement.id = `toast-${toast.id}`
  toastElement.className = 'toast glass-card pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg transition-all duration-300 translate-x-full opacity-0'

  if (toast.type === 'error' || toast.type === 'warning') {
    toastElement.setAttribute('role', 'alert')
    toastElement.setAttribute('aria-live', 'assertive')
  } else {
    toastElement.setAttribute('role', 'status')
    toastElement.setAttribute('aria-live', 'polite')
  }

  const typeStyles: Record<ToastType, string> = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500/30 bg-red-500/10 text-red-400',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    warning: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  }
  toastElement.className += ` ${typeStyles[toast.type] || typeStyles.info}`

  const iconWrap = document.createElement('div')
  iconWrap.className = 'shrink-0'
  iconWrap.innerHTML = iconSvgByType[toast.type] ?? iconSvgByType.info
  toastElement.appendChild(iconWrap)

  const messageElement = document.createElement('p')
  messageElement.className = 'flex-1 text-sm font-medium'
  messageElement.textContent = toast.message
  toastElement.appendChild(messageElement)

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'toast-close shrink-0 rounded p-1 transition-colors hover:bg-black/10'
  closeButton.setAttribute('aria-label', closeAriaLabel)
  closeButton.innerHTML = closeButtonSvgMarkup
  closeButton.addEventListener('click', () => removeToast(toast.id))
  toastElement.appendChild(closeButton)

  return toastElement
}

function removeToast(id: string): void {
  const toastElement = document.getElementById(`toast-${id}`)
  if (!toastElement) return

  toastElement.classList.add('translate-x-full', 'opacity-0')
  setTimeout(() => toastElement.remove(), 300)
}

function showToast(options: ToastOptions): void {
  const container = document.getElementById('toast-container')
  if (!container) return

  const toast: ToastPayload = {
    id: `toast-${toastIdCounter++}`,
    type: options.type || 'info',
    message: options.message,
    duration: options.duration || 3000,
  }

  const toastElement = createToastElement(toast, getCloseAriaLabel())
  container.appendChild(toastElement)

  requestAnimationFrame(() => {
    toastElement.classList.remove('translate-x-full', 'opacity-0')
    toastElement.classList.add('translate-x-0', 'opacity-100')
  })

  if (toast.duration > 0) {
    setTimeout(() => removeToast(toast.id), toast.duration)
  }
}

function registerToast(): void {
  if (typeof window === 'undefined') return
  const scopedWindow = window as WindowWithToastInit
  if (scopedWindow.__resonanceToastInitialized) return

  const container = document.getElementById('toast-container')
  if (!container) {
    setTimeout(registerToast, 100)
    return
  }

  window.showToast = showToast
  window.toast = {
    success: (message: string, duration?: number) => showToast({ type: 'success', message, duration }),
    error: (message: string, duration?: number) => showToast({ type: 'error', message, duration }),
    info: (message: string, duration?: number) => showToast({ type: 'info', message, duration }),
    warning: (message: string, duration?: number) => showToast({ type: 'warning', message, duration }),
  }
  scopedWindow.__resonanceToastInitialized = true
}

runOnce('toast', () => {
  onDomReady(registerToast)
  onAstroPageLoad(registerToast)
})
