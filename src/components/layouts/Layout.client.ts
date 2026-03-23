type LayoutSidebarMessages = {
  sidebarOpenLabel?: string
  sidebarCloseLabel?: string
  signingOutLabel?: string
  signOutErrorLabel?: string
}

import { onDomReady, runOnce } from '../../scripts/client/runtime'
import { decodeBase64Json } from '../../scripts/client/encoding'

function parseLayoutSidebarMessages(): Required<LayoutSidebarMessages> {
  const fallback: Required<LayoutSidebarMessages> = {
    sidebarOpenLabel: 'Open menu',
    sidebarCloseLabel: 'Close menu',
    signingOutLabel: 'Signing out...',
    signOutErrorLabel: 'Error while signing out',
  }

  const elements = Array.from(document.querySelectorAll('#layout-sidebar-messages')).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  )
  const element = elements.at(-1) ?? null
  const raw = element?.textContent?.trim()
  if (!raw) return fallback

  const compact = raw.replace(/\s/g, '')
  if (!/^[A-Za-z0-9+/=]+$/.test(compact)) return fallback
  const decoded = decodeBase64Json<LayoutSidebarMessages>(compact)
  if (!decoded) return fallback

  return {
    sidebarOpenLabel: decoded.sidebarOpenLabel ?? fallback.sidebarOpenLabel,
    sidebarCloseLabel: decoded.sidebarCloseLabel ?? fallback.sidebarCloseLabel,
    signingOutLabel: decoded.signingOutLabel ?? fallback.signingOutLabel,
    signOutErrorLabel: decoded.signOutErrorLabel ?? fallback.signOutErrorLabel,
  }
}

function setThemeOnDocument(documentElement: HTMLElement): void {
  const prefersDark =
    typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)').matches : false
  const theme =
    localStorage.theme === 'dark' || (!('theme' in localStorage) && prefersDark) ? 'dark' : 'light'
  documentElement.setAttribute('data-theme', theme)
}

async function handleSignOut(messages: Required<LayoutSidebarMessages>): Promise<void> {
  try {
    window.toast?.info(messages.signingOutLabel, 2000)
    const auth = await import('../../lib/auth-client')
    await auth.signOut()
    sessionStorage.setItem('showLogoutToast', 'true')
    setTimeout(() => {
      window.location.href = '/login'
    }, 500)
  } catch (error) {
    console.error('Error signing out:', error)
    window.toast?.error(messages.signOutErrorLabel)
    setTimeout(() => {
      window.location.href = '/login'
    }, 1000)
  }
}

function initLayoutClient(): void {
  const messages = parseLayoutSidebarMessages()

  if (document.documentElement.dataset.layoutClientInitialized === 'true') return
  document.documentElement.dataset.layoutClientInitialized = 'true'

  document.addEventListener('astro:before-swap', (event: Event) => {
    const detail = (event as CustomEvent<{ newDocument?: Document }>).detail
    if (detail?.newDocument?.documentElement) {
      setThemeOnDocument(detail.newDocument.documentElement)
    }
  })

  document.addEventListener('click', (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) return

    if (target.closest('#sidebar-toggle-btn')) {
      document.body.classList.toggle('sidebar-open')
      const open = document.body.classList.contains('sidebar-open')
      const button = document.getElementById('sidebar-toggle-btn')
      if (button) {
        button.setAttribute('aria-expanded', String(open))
        button.setAttribute('aria-label', open ? messages.sidebarCloseLabel : messages.sidebarOpenLabel)
      }
      return
    }

    if (target.closest('#sidebar-close-btn') || target.closest('[data-sidebar-backdrop]')) {
      document.body.classList.remove('sidebar-open')
      return
    }

    if (target.closest('#sidebar-signout-btn')) {
      event.preventDefault()
      event.stopPropagation()
      void handleSignOut(messages)
    }
  })
}

runOnce('layout-client', () => {
  onDomReady(initLayoutClient)
})
