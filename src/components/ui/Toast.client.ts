import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

type ToastType = 'success' | 'error' | 'info' | 'warning'
type ToastPayload = { id: string; type: ToastType; message: string; duration: number }
type ToastOptions = { type?: ToastType; message: string; duration?: number }

type WindowWithToastInit = Window & {
  __resonanceToastInitialized?: boolean
}

/** Clone une icône pré-rendue depuis le template serveur (#toast-icon-tpl). */
function cloneIcon(type: ToastType | 'close'): Node | null {
  const tpl = document.getElementById('toast-icon-tpl')
  const source = tpl?.querySelector<HTMLElement>(`[data-type="${type}"]`)
  return source ? source.cloneNode(true) : null
}

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
  const iconNode = cloneIcon(toast.type)
  if (iconNode) iconWrap.appendChild(iconNode)
  toastElement.appendChild(iconWrap)

  const messageElement = document.createElement('p')
  messageElement.className = 'flex-1 text-sm font-medium'
  messageElement.textContent = toast.message
  toastElement.appendChild(messageElement)

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'toast-close shrink-0 rounded p-1 transition-colors hover:bg-black/10'
  closeButton.setAttribute('aria-label', closeAriaLabel)
  const closeIcon = cloneIcon('close')
  if (closeIcon) closeButton.appendChild(closeIcon)
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
