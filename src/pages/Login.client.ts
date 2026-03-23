/**
 * Script client pour la page login.
 * Lit la config depuis #login-messages (base64 JSON).
 */

import { onAstroPageLoad, onDomReady } from '../scripts/client/runtime'
import { decodeBase64Json } from '../scripts/client/encoding'

type LoginMessages = {
  form: Record<string, string>
  errors: Record<string, string>
  toasts?: { signedOutSuccess?: string; oauthNotConfigured?: string }
}

function getLatestElementById(id: string): HTMLElement | null {
  const elements = Array.from(document.querySelectorAll(`#${id}`)).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  )
  return elements.at(-1) ?? null
}

function getMessages(): LoginMessages | null {
  const el = getLatestElementById('login-messages')
  const raw = el?.textContent?.trim()
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''))) return null
  return decodeBase64Json<LoginMessages>(raw)
}

function run(messages: LoginMessages | null): void {
  if (!messages) return
  const root = getLatestElementById('password')?.closest('form')
  if (!(root instanceof HTMLFormElement)) return
  if (root.dataset.initialized === 'true') return
  root.dataset.initialized = 'true'

  const form = messages.form
  const errors = messages.errors

  const togglePasswordButton = root.querySelector('#toggle-password')
  const passwordInput = root.querySelector('#password') as HTMLInputElement | null
  const eyeIcon = root.querySelector('#eye-icon')
  const eyeOffIcon = root.querySelector('#eye-off-icon')

  if (togglePasswordButton && passwordInput) {
    togglePasswordButton.addEventListener('click', function () {
      const isPassword = passwordInput.type === 'password'
      passwordInput.type = isPassword ? 'text' : 'password'
      if (eyeIcon && eyeOffIcon) {
        if (isPassword) {
          eyeIcon.classList.add('hidden')
          eyeOffIcon.classList.remove('hidden')
          togglePasswordButton.setAttribute('aria-label', form.hidePassword)
        } else {
          eyeIcon.classList.remove('hidden')
          eyeOffIcon.classList.add('hidden')
          togglePasswordButton.setAttribute('aria-label', form.showPassword)
        }
      }
    })
  }

  const formEl = root
  const emailInput = root.querySelector('#email') as HTMLInputElement | null
  const errorBox = root.querySelector('#login-error')

  function setFieldError(input: HTMLElement | null, hasError: boolean): void {
    if (!input) return
    if (hasError) {
      input.setAttribute('aria-invalid', 'true')
      input.classList.add('border-red-500')
    } else {
      input.removeAttribute('aria-invalid')
      input.classList.remove('border-red-500')
    }
  }

  if (formEl) {
    formEl.addEventListener('submit', async function (event: Event) {
      event.preventDefault()
      const formData = new FormData(formEl)
      const email = formData.get('email')
      const password = formData.get('password')
      if (errorBox) {
        errorBox.classList.add('hidden')
        errorBox.textContent = ''
      }
      setFieldError(emailInput, false)
      setFieldError(passwordInput, false)
      if (!email || !password) {
        if (errorBox) {
          errorBox.textContent = errors.fillRequired
          errorBox.classList.remove('hidden')
        }
        setFieldError(emailInput, !email)
        setFieldError(passwordInput, !password)
        if (!email && emailInput) emailInput.focus()
        else if (!password && passwordInput) passwordInput.focus()
        window.toast?.error(errors.fillRequired)
        return
      }
      const submitButton = formEl.querySelector<HTMLButtonElement>('button[type="submit"]')
      const originalButtonText = submitButton?.textContent || (form as { submit?: string }).submit || ''
      if (submitButton) {
        submitButton.disabled = true
        submitButton.textContent = form.signingIn
      }
      try {
        const body = new URLSearchParams({ email: String(email), password: String(password) })
        const response = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          credentials: 'include',
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          const message = (data.message || data.error || errors.signInError) as string
          if (errorBox) { errorBox.textContent = message; errorBox.classList.remove('hidden') }
          setFieldError(emailInput, true)
          setFieldError(passwordInput, true)
          if (emailInput) emailInput.focus()
          window.toast?.error(message)
          return
        }
        sessionStorage.setItem('showWelcomeToast', 'true')
        const currentUrl = new URL(window.location.href)
        const redirectParam = currentUrl.searchParams.get('redirectTo')
        const redirectTarget = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/'
        document.location.href = redirectTarget
      } catch (error) {
        console.error('Error signing in:', error)
        const errorMessage = error instanceof Error ? error.message : errors.generic
        if (errorBox) { errorBox.textContent = errorMessage; errorBox.classList.remove('hidden') }
        window.toast?.error(errorMessage)
      } finally {
        if (submitButton) {
          submitButton.disabled = false
          submitButton.textContent = originalButtonText || (form as { submit?: string }).submit || ''
        }
      }
    })
  }

  const showLogoutToast = sessionStorage.getItem('showLogoutToast')
  if (
    showLogoutToast &&
    (window as Window & { toast?: { info?: (message: string, duration?: number) => void } }).toast?.info &&
    messages.toasts
  ) {
    ;(window as Window & { toast: { info: (message: string, duration?: number) => void } }).toast.info(
      messages.toasts.signedOutSuccess ?? '',
      4000
    )
    sessionStorage.removeItem('showLogoutToast')
  }
  const urlParams = new URLSearchParams(window.location.search)
  const oauthError = urlParams.get('error')
  if (
    oauthError === 'oauth_not_configured' &&
    (window as Window & { toast?: { warning?: (message: string, duration?: number) => void } }).toast?.warning &&
    messages.toasts
  ) {
    ;(window as Window & { toast: { warning: (message: string, duration?: number) => void } }).toast.warning(
      messages.toasts.oauthNotConfigured ?? '',
      5000
    )
    window.history.replaceState({}, document.title, window.location.pathname)
  }
}

onDomReady(() => run(getMessages()))
onAstroPageLoad(() => run(getMessages()))
