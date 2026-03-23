/**
 * Script client pour la page signup.
 * Lit la config depuis #signup-messages (base64 JSON).
 */

import { onAstroPageLoad, onDomReady } from '../scripts/client/runtime'
import { decodeBase64Json } from '../scripts/client/encoding'

type SignupMessages = {
  showPasswordLabel: string
  hidePasswordLabel: string
  fillRequiredError: string
  createAccountError: string
  genericError: string
  submitButtonLabel: string
  creatingLabel: string
}

function getMessages(): SignupMessages | null {
  const el = document.getElementById('signup-messages')
  const raw = el?.textContent?.trim()
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw.replace(/\s/g, ''))) return null
  return decodeBase64Json<SignupMessages>(raw)
}

function run(messages: SignupMessages | null): void {
  if (!messages) return
  const {
    showPasswordLabel,
    hidePasswordLabel,
    fillRequiredError,
    createAccountError,
    genericError,
    submitButtonLabel,
    creatingLabel,
  } = messages

  const togglePasswordButton = document.getElementById('toggle-password')
  const passwordInput = document.getElementById('password') as HTMLInputElement | null
  const eyeIcon = document.getElementById('eye-icon')
  const eyeOffIcon = document.getElementById('eye-off-icon')

  togglePasswordButton?.addEventListener('click', () => {
    if (!passwordInput) return
    const isPassword = passwordInput.type === 'password'
    passwordInput.type = isPassword ? 'text' : 'password'
    if (eyeIcon && eyeOffIcon) {
      if (isPassword) {
        eyeIcon.classList.remove('hidden')
        eyeOffIcon.classList.add('hidden')
        togglePasswordButton.setAttribute('aria-label', hidePasswordLabel)
      } else {
        eyeIcon.classList.add('hidden')
        eyeOffIcon.classList.remove('hidden')
        togglePasswordButton.setAttribute('aria-label', showPasswordLabel)
      }
    }
  })

  const form = document.querySelector('form') as HTMLFormElement | null
  const emailInput = document.getElementById('email') as HTMLInputElement | null
  const nameInput = document.getElementById('name') as HTMLInputElement | null
  const errorBox = document.getElementById('signup-error')

  function setFieldError(input: HTMLInputElement | null, hasError: boolean): void {
    if (!input) return
    if (hasError) {
      input.setAttribute('aria-invalid', 'true')
      input.classList.add('border-red-500')
    } else {
      input.removeAttribute('aria-invalid')
      input.classList.remove('border-red-500')
    }
  }

  form?.addEventListener('submit', async (event: Event) => {
    event.preventDefault()
    if (!form) return
    const formData = new FormData(form)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (errorBox) {
      errorBox.classList.add('hidden')
      errorBox.textContent = ''
    }
    setFieldError(emailInput, false)
    setFieldError(passwordInput, false)

    if (!email || !password) {
      if (errorBox) {
        errorBox.textContent = fillRequiredError
        errorBox.classList.remove('hidden')
      }
      setFieldError(emailInput, !email)
      setFieldError(passwordInput, !password)
      if (!email && emailInput) emailInput.focus()
      else if (!password && passwordInput) passwordInput.focus()
      window.toast?.error(fillRequiredError)
      return
    }

    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null
    const originalButtonText = submitButton?.textContent ?? ''

    try {
      if (submitButton) {
        submitButton.disabled = true
        submitButton.textContent = creatingLabel
      }
      const { signUp } = await import('../lib/auth-client')
      const nameValue: string = name != null && String(name).trim() !== '' ? String(name) : ''
      const result = await signUp.email({
        email: String(email),
        password: String(password),
        name: nameValue,
      })

      if (result.error) {
        const message = result.error.message ?? createAccountError
        if (errorBox) {
          errorBox.textContent = message
          errorBox.classList.remove('hidden')
        }
        setFieldError(emailInput, true)
        setFieldError(passwordInput, true)
        if (emailInput) emailInput.focus()
        window.toast?.error(message)
        return
      }

      if (nameValue !== '' && (!result.data?.user?.name)) {
        try {
          const updateResponse = await fetch('/api/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nameValue }),
          })
          if (!updateResponse.ok) console.warn('Account created but name could not be updated')
        } catch {
          console.warn('Error updating name')
        }
      }

      sessionStorage.setItem('showWelcomeToast', 'true')
      sessionStorage.setItem('isNewUser', 'true')
      const currentUrl = new URL(window.location.href)
      const redirectParam = currentUrl.searchParams.get('redirectTo')
      const redirectTarget = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/'
      document.location.href = redirectTarget
    } catch (error) {
      console.error('Error signing up:', error)
      const errorMessage = error instanceof Error ? error.message : genericError
      if (errorBox) {
        errorBox.textContent = errorMessage
        errorBox.classList.remove('hidden')
      }
      window.toast?.error(errorMessage)
    } finally {
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = originalButtonText || submitButtonLabel
      }
    }
  })
}

onDomReady(() => run(getMessages()))
onAstroPageLoad(() => run(getMessages()))
