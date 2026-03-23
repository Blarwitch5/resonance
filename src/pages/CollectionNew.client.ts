import { onAstroPageLoad, onDomReady } from '../scripts/client/runtime'

function decodeBase64Json<T>(raw: string): T | null {
  try {
    const binary = atob(raw)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    const decoded = new TextDecoder('utf-8').decode(bytes)
    return JSON.parse(decoded) as T
  } catch {
    try {
      return JSON.parse(atob(raw)) as T
    } catch {
      return null
    }
  }
}

type CollectionNewMessages = {
  provideName: string
  creating: string
  submit: string
  success: string
  createError: string
  createErrorGeneric: string
}

function runCollectionNewPage(): void {
  const formElement = document.getElementById('create-collection-form') as HTMLFormElement | null
  if (!formElement || formElement.dataset.initialized === 'true') return
  formElement.dataset.initialized = 'true'

  const messagesElement = document.getElementById('collection-new-messages')
  const rawMessages = messagesElement?.textContent?.trim() ?? ''
  const parsedMessages = rawMessages ? decodeBase64Json<CollectionNewMessages>(rawMessages) : null
  const messages: CollectionNewMessages = parsedMessages ?? {
    provideName: '',
    creating: '',
    submit: '',
    success: '',
    createError: '',
    createErrorGeneric: '',
  }

  const errorElement = document.getElementById('create-collection-error')
  const nameInputElement = document.getElementById('name') as HTMLInputElement | null

  function setFieldError(hasError: boolean): void {
    if (!nameInputElement) return
    if (hasError) {
      nameInputElement.setAttribute('aria-invalid', 'true')
      nameInputElement.classList.add('border-red-500')
    } else {
      nameInputElement.removeAttribute('aria-invalid')
      nameInputElement.classList.remove('border-red-500')
    }
  }

  formElement.addEventListener('submit', async (event: Event) => {
    event.preventDefault()

    if (errorElement) {
      errorElement.classList.add('hidden')
      errorElement.textContent = ''
    }
    setFieldError(false)

    const formData = new FormData(formElement)
    const nameValue = formData.get('name')
    const name = typeof nameValue === 'string' ? nameValue.trim() : ''

    if (!name) {
      if (errorElement) {
        errorElement.textContent = messages.provideName
        errorElement.classList.remove('hidden')
      }
      setFieldError(true)
      nameInputElement?.focus()
      ;(window as Window & { toast?: { error?: (message: string) => void } }).toast?.error?.(messages.provideName)
      return
    }

    const collectionData = {
      name,
      description: formData.get('description'),
      isPublic: formData.get('isPublic') === 'on',
    }

    const submitButton = formElement.querySelector('button[type="submit"]') as HTMLButtonElement | null
    const originalText = submitButton?.textContent ?? messages.submit
    if (submitButton) {
      submitButton.disabled = true
      submitButton.textContent = messages.creating
    }

    try {
      const response = await fetch('/api/collections/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectionData),
      })

      const responseData = await response.json().catch(
        () => ({} as { error?: string; slug?: string; maxCollections?: number; currentCount?: number }),
      )

      if (response.ok) {
        ;(window as Window & { toast?: { success?: (message: string) => void } }).toast?.success?.(messages.success)
        window.location.href = responseData.slug ? `/collections/${responseData.slug}` : '/collections'
        return
      }

      const errorMessage = responseData.error ?? messages.createError
      if (errorElement) {
        errorElement.textContent = errorMessage
        errorElement.classList.remove('hidden')
      }
      setFieldError(true)
      nameInputElement?.focus()
      ;(window as Window & { toast?: { error?: (message: string) => void } }).toast?.error?.(errorMessage)

      if (
        typeof responseData.maxCollections === 'number' &&
        typeof responseData.currentCount === 'number' &&
        responseData.currentCount >= responseData.maxCollections
      ) {
        window.setTimeout(() => {
          window.location.href = '/collections'
        }, 3000)
      }
    } catch (error) {
      console.error('Error creating collection:', error)
      if (errorElement) {
        errorElement.textContent = messages.createErrorGeneric
        errorElement.classList.remove('hidden')
      }
      setFieldError(true)
      ;(window as Window & { toast?: { error?: (message: string) => void } }).toast?.error?.(messages.createErrorGeneric)
    } finally {
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = originalText
      }
    }
  })
}

onDomReady(runCollectionNewPage)
onAstroPageLoad(runCollectionNewPage)
