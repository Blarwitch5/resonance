/**
 * Script client pour la page forgot-password.
 * Lit la config depuis #forgot-password-messages (base64 JSON).
 */

import { onAstroPageLoad, onDomReady } from '../scripts/client/runtime'
import { decodeBase64Json } from '../scripts/client/encoding'

type ForgotPasswordMessages = {
  enterEmailError: string
  sendingLabel: string
  tryAgainError: string
}

function getMessages(): ForgotPasswordMessages | null {
  const el = document.getElementById('forgot-password-messages')
  const raw = el?.textContent?.trim()
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''))) return null
  return decodeBase64Json<ForgotPasswordMessages>(raw)
}

function run(messages: ForgotPasswordMessages | null): void {
  if (!messages) return

  const form = document.getElementById('forgot-password-form') as HTMLFormElement | null
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement | null
  const errorMessage = document.getElementById('error-message')
  const successMessage = document.getElementById('success-message')
  const emailInputEl = document.getElementById('email') as HTMLInputElement | null
  const { enterEmailError, sendingLabel, tryAgainError } = messages

  function showError(message: string): void {
    if (errorMessage) {
      errorMessage.textContent = message
      errorMessage.classList.remove('hidden')
      successMessage?.classList.add('hidden')
    }
    if (emailInputEl) {
      emailInputEl.setAttribute('aria-invalid', 'true')
      emailInputEl.focus()
    }
  }

  form?.addEventListener('submit', async (event: Event) => {
    event.preventDefault()
    if (!form || !submitBtn) return
    const formData = new FormData(form)
    const email = formData.get('email') as string

    if (!email) {
      showError(enterEmailError)
      return
    }

    errorMessage?.classList.add('hidden')
    successMessage?.classList.add('hidden')
    emailInputEl?.removeAttribute('aria-invalid')

    const setButtonLoading = (window as Window & { setButtonLoading?: (el: HTMLButtonElement, loading: boolean, text: string) => void }).setButtonLoading
    if (setButtonLoading) setButtonLoading(submitBtn, true, sendingLabel)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      if (response.ok) {
        successMessage?.classList.remove('hidden')
        form.reset()
        if (import.meta.env.DEV && data.token) {
          console.log('🔑 Reset token (DEV):', data.token)
          console.log('🔗 Reset link:', `${window.location.origin}/reset-password?token=${data.token}`)
        }
      } else {
        successMessage?.classList.remove('hidden')
        form.reset()
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : tryAgainError)
    } finally {
      if (setButtonLoading) setButtonLoading(submitBtn, false, '')
    }
  })
}

onDomReady(() => run(getMessages()))
onAstroPageLoad(() => run(getMessages()))
