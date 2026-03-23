/**
 * Script client pour la page d'accueil (toasts welcome, sign out).
 * Lit la config depuis #index-toasts-messages (base64 JSON).
 */

import { onAstroPageLoad, onDomReady } from '../scripts/client/runtime'
import { decodeBase64Json } from '../scripts/client/encoding'

type HomeToasts = {
  welcomeNew: string
  welcomeNewNoName: string
  welcomeBack: string
  welcomeBackNoName: string
  signingOut: string
  signOutError: string
}

function getMessages(): HomeToasts | null {
  const el = document.getElementById('index-toasts-messages')
  const raw = el?.textContent?.trim()
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''))) return null
  return decodeBase64Json<HomeToasts>(raw)
}

function run(messages: HomeToasts | null): void {
  if (!messages) return
  const toast = (window as Window & { toast?: { success?: (m: string, d?: number) => void; info?: (m: string, d?: number) => void; error?: (m: string) => void } }).toast

  const showWelcomeToast = sessionStorage.getItem('showWelcomeToast')
  const isNewUser = sessionStorage.getItem('isNewUser')

  if (showWelcomeToast && toast?.success) {
    const welcomeH3 = document.querySelector('h2.font-display')
    let userName = ''
    if (welcomeH3) {
      const welcomeText = welcomeH3.textContent ?? ''
      const match = welcomeText.match(/[\s\S]+?([^!]+)!?$/)
      userName = match ? match[1].trim() : ''
    }
    if (isNewUser) {
      toast.success(userName ? messages.welcomeNew.replace('{name}', userName) : messages.welcomeNewNoName, 5000)
      sessionStorage.removeItem('isNewUser')
    } else {
      toast.success(userName ? messages.welcomeBack.replace('{name}', userName) : messages.welcomeBackNoName, 4000)
    }
    sessionStorage.removeItem('showWelcomeToast')
  }

  const signOutBtn = document.getElementById('sign-out-btn')
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        const { signOut } = await import('../lib/auth-client')
        if (toast?.info) toast.info(messages.signingOut, 2000)
        await signOut()
        sessionStorage.setItem('showLogoutToast', 'true')
        setTimeout(() => { window.location.href = '/login' }, 500)
      } catch (error) {
        console.error('Error signing out:', error)
        if (toast?.error) toast.error(messages.signOutError)
        setTimeout(() => { window.location.href = '/login' }, 1000)
      }
    })
  }
}

onDomReady(() => run(getMessages()))
onAstroPageLoad(() => run(getMessages()))
