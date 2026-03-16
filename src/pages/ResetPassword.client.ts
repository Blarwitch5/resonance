/**
 * Script client pour la page reset-password.
 * Lit la config depuis #reset-password-messages (base64 JSON).
 */

type ResetPasswordMessages = {
  errorMinLength: string
  errorLowercase: string
  errorUppercase: string
  errorNumber: string
  errorSpecial: string
  errorNoMatch: string
  errorGeneric: string
  errorTryAgain: string
  submittingLabel: string
}

function getMessages(): ResetPasswordMessages | null {
  const el = document.getElementById('reset-password-messages')
  const raw = el?.textContent?.trim()
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''))) return null
  try {
    return JSON.parse(atob(raw)) as ResetPasswordMessages
  } catch {
    return null
  }
}

function run(messages: ResetPasswordMessages | null): void {
  if (!messages) return

  const form = document.getElementById('reset-password-form') as HTMLFormElement | null
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement | null
  const errorMessage = document.getElementById('error-message')
  const successMessage = document.getElementById('success-message')
  const passwordInput = document.getElementById('password') as HTMLInputElement | null
  const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement | null

  const {
    errorMinLength,
    errorLowercase,
    errorUppercase,
    errorNumber,
    errorSpecial,
    errorNoMatch,
    errorTryAgain,
    submittingLabel,
  } = messages

  function validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) return { valid: false, error: errorMinLength }
    if (!/[a-z]/.test(password)) return { valid: false, error: errorLowercase }
    if (!/[A-Z]/.test(password)) return { valid: false, error: errorUppercase }
    if (!/[0-9]/.test(password)) return { valid: false, error: errorNumber }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return { valid: false, error: errorSpecial }
    return { valid: true }
  }

  function checkPasswordMatch(): boolean {
    if (!passwordInput || !confirmPasswordInput) return true
    const password = passwordInput.value
    const confirmPassword = confirmPasswordInput.value
    if (confirmPassword && password !== confirmPassword) {
      if (errorMessage) {
        errorMessage.textContent = errorNoMatch
        errorMessage.classList.remove('hidden')
      }
      return false
    }
    errorMessage?.classList.add('hidden')
    return true
  }

  function showError(message: string, field?: 'password' | 'confirm'): void {
    if (errorMessage) {
      errorMessage.textContent = message
      errorMessage.classList.remove('hidden')
      successMessage?.classList.add('hidden')
    }
    if (field === 'password' && passwordInput) {
      passwordInput.setAttribute('aria-invalid', 'true')
      passwordInput.focus()
    } else if (field === 'confirm' && confirmPasswordInput) {
      confirmPasswordInput.setAttribute('aria-invalid', 'true')
      confirmPasswordInput.focus()
    }
  }

  if (confirmPasswordInput && passwordInput) {
    confirmPasswordInput.addEventListener('input', checkPasswordMatch)
    passwordInput.addEventListener('input', () => errorMessage?.classList.add('hidden'))
  }

  form?.addEventListener('submit', async (event: Event) => {
    event.preventDefault()
    if (!form || !submitBtn || !passwordInput || !confirmPasswordInput) return
    const formData = new FormData(form)
    const token = formData.get('token') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    errorMessage?.classList.add('hidden')
    successMessage?.classList.add('hidden')
    passwordInput.removeAttribute('aria-invalid')
    confirmPasswordInput.removeAttribute('aria-invalid')

    const validation = validatePassword(password)
    if (!validation.valid) {
      showError(validation.error!, 'password')
      return
    }
    if (password !== confirmPassword) {
      showError(errorNoMatch, 'confirm')
      return
    }

    const setButtonLoading = (window as Window & { setButtonLoading?: (el: HTMLButtonElement, loading: boolean, text: string) => void }).setButtonLoading
    if (setButtonLoading) setButtonLoading(submitBtn, true, submittingLabel)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await response.json()
      if (response.ok) {
        successMessage?.classList.remove('hidden')
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000)
      } else {
        showError(data?.message ?? data?.error ?? errorTryAgain, 'password')
      }
    } catch (error) {
      showError(
        error instanceof Error ? error.message : errorTryAgain,
        'password'
      )
    } finally {
      if (setButtonLoading) setButtonLoading(submitBtn, false, '')
    }
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => run(getMessages()), { once: true })
} else {
  run(getMessages())
}
document.addEventListener('astro:page-load', () => run(getMessages()))
