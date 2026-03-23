const providers = ['discord', 'google', 'spotify'] as const

import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

function initOAuthButtons(): void {
  providers.forEach((provider) => {
    const button = document.getElementById(`oauth-${provider}`)
    if (!(button instanceof HTMLButtonElement)) return
    if (button.dataset.oauthInitialized === 'true') return
    button.dataset.oauthInitialized = 'true'

    button.addEventListener('click', () => {
      if (window.setButtonLoading) window.setButtonLoading(button, true, '')
      try {
        const baseUrl = window.location.origin
        const callbackUrl = `${window.location.origin}/`
        const oauthUrl = `${baseUrl}/api/auth/oauth/${provider}?callbackURL=${encodeURIComponent(callbackUrl)}`
        window.location.href = oauthUrl
      } catch (error) {
        console.error(`Error signing in with ${provider}:`, error)
        window.toast?.error(`Error signing in with ${provider}`)
        if (window.setButtonLoading) window.setButtonLoading(button, false)
      }
    })
  })
}

runOnce('oauth-buttons', () => {
  onDomReady(initOAuthButtons)
  onAstroPageLoad(initOAuthButtons)
})
