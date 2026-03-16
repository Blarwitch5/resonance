/**
 * Script client pour la page login.
 * Lit la config depuis #login-messages (base64 JSON).
 */

type LoginMessages = {
  form: Record<string, string>
  errors: Record<string, string>
  toasts?: { signedOutSuccess?: string; oauthNotConfigured?: string }
}

function getMessages(): LoginMessages | null {
  const el = document.getElementById('login-messages')
  const raw = el?.textContent?.trim()
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''))) return null
  try {
    return JSON.parse(atob(raw)) as LoginMessages
  } catch {
    return null
  }
}

function run(messages: LoginMessages | null): void {
  if (!messages) return
  const form = messages.form
  const errors = messages.errors

  const togglePasswordButton = document.getElementById('toggle-password')
  const passwordInput = document.getElementById('password')
  const eyeIcon = document.getElementById('eye-icon')
  const eyeOffIcon = document.getElementById('eye-off-icon')

  if (togglePasswordButton && passwordInput) {
    togglePasswordButton.addEventListener('click', function () {
      const isPassword = passwordInput.type === 'password'
      passwordInput.type = isPassword ? 'text' : 'password'
      if (eyeIcon && eyeOffIcon) {
        if (isPassword) {
          eyeIcon.classList.remove('hidden')
          eyeOffIcon.classList.add('hidden')
          togglePasswordButton.setAttribute('aria-label', form.hidePassword)
        } else {
          eyeIcon.classList.add('hidden')
          eyeOffIcon.classList.remove('hidden')
          togglePasswordButton.setAttribute('aria-label', form.showPassword)
        }
      }
    })
  }

  const formEl = document.querySelector('form[action="/api/auth/sign-in/email"]')
  const emailInput = document.getElementById('email')
  const errorBox = document.getElementById('login-error')

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
      const formData = new FormData(formEl as HTMLFormElement)
      const email = formData.get('email')
      const password = formData.get('password')
      if (errorBox) {
        errorBox.classList.add('hidden')
        errorBox.textContent = ''
      }
      setFieldError(emailInput as HTMLElement | null, false)
      setFieldError(passwordInput as HTMLElement | null, false)
      if (!email || !password) {
        if (errorBox) {
          errorBox.textContent = errors.fillRequired
          errorBox.classList.remove('hidden')
        }
        setFieldError(emailInput as HTMLElement | null, !email)
        setFieldError(passwordInput as HTMLElement | null, !password)
        if (!email && emailInput) (emailInput as HTMLInputElement).focus()
        else if (!password && passwordInput) (passwordInput as HTMLInputElement).focus()
        if ((window as Window & { toast?: (m: string) => void }).toast) (window as Window & { toast: (m: string) => void }).toast.error(errors.fillRequired)
        return
      }
      const submitButton = formEl.querySelector('button[type="submit"]')
      const originalButtonText = submitButton ? (submitButton as HTMLButtonElement).textContent || '' : (form as { submit?: string }).submit
      if (submitButton) {
        (submitButton as HTMLButtonElement).disabled = true
        (submitButton as HTMLButtonElement).textContent = form.signingIn
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
          setFieldError(emailInput as HTMLElement | null, true)
          setFieldError(passwordInput as HTMLElement | null, true)
          if (emailInput) (emailInput as HTMLInputElement).focus()
          if ((window as Window & { toast?: (m: string) => void }).toast) (window as Window & { toast: (m: string) => void }).toast.error(message)
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
        if ((window as Window & { toast?: (m: string) => void }).toast) (window as Window & { toast: (m: string) => void }).toast.error(errorMessage)
      } finally {
        if (submitButton) {
          (submitButton as HTMLButtonElement).disabled = false
          (submitButton as HTMLButtonElement).textContent = originalButtonText || (form as { submit?: string }).submit || ''
        }
      }
    })
  }

  document.addEventListener('DOMContentLoaded', function () {
    const showLogoutToast = sessionStorage.getItem('showLogoutToast')
    if (showLogoutToast && (window as Window & { toast?: { info?: (m: string, d?: number) => void } }).toast?.info && messages.toasts) {
      (window as Window & { toast: { info: (m: string, d?: number) => void } }).toast.info(messages.toasts.signedOutSuccess ?? '', 4000)
      sessionStorage.removeItem('showLogoutToast')
    }
    const urlParams = new URLSearchParams(window.location.search)
    const oauthError = urlParams.get('error')
    if (oauthError === 'oauth_not_configured' && (window as Window & { toast?: { warning?: (m: string, d?: number) => void } }).toast?.warning && messages.toasts) {
      (window as Window & { toast: { warning: (m: string, d?: number) => void } }).toast.warning(messages.toasts.oauthNotConfigured ?? '', 5000)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => run(getMessages()), { once: true })
} else {
  run(getMessages())
}
document.addEventListener('astro:page-load', () => run(getMessages()))
