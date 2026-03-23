import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'

type PersonalDataMessages = {
  saving: string
  saveLabel: string
  removeTagAria: string
  errorSaving: string
  errorGeneric: string
}

function getMessages(): PersonalDataMessages {
  const fallback: PersonalDataMessages = {
    saving: 'Saving...',
    saveLabel: 'Save',
    removeTagAria: 'Remove tag {tag}',
    errorSaving: 'Error while saving',
    errorGeneric: 'Error',
  }

  const element = document.getElementById('personal-data-messages')
  if (!element?.textContent) return fallback
  try {
    const parsed = JSON.parse(element.textContent) as Partial<PersonalDataMessages>
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

function initPersonalDataSection(): void {
  const section = document.querySelector('.personal-data-section')
  if (!(section instanceof HTMLElement)) return
  if (section.dataset.initialized === 'true') return
  section.dataset.initialized = 'true'

  const messages = getMessages()

  const itemId = section.getAttribute('data-item-id')
  if (!itemId) return

  const viewMode = section.querySelector('[data-mode="view"]')
  const editMode = section.querySelector('[data-mode="edit"]')
  const toggleButton = section.querySelector('[data-action="toggle-edit"]')
  const cancelButton = section.querySelector('[data-action="cancel-edit"]')
  const form = section.querySelector('form.edit-mode')
  const starContainer = section.querySelector('[data-star-rating]')
  const starValueInput = section.querySelector(`#personal-rating-value-${itemId}`)
  const tagsInput = section.querySelector('[data-tags-input]')
  const customTagsValue = section.querySelector(`#custom-tags-value-${itemId}`)

  let currentTags: string[] = []
  if (customTagsValue instanceof HTMLInputElement) {
    try {
      currentTags = JSON.parse(customTagsValue.value || '[]') as string[]
      if (!Array.isArray(currentTags)) currentTags = []
    } catch {
      currentTags = []
    }
  }

  const showView = (): void => {
    if (viewMode instanceof HTMLElement) viewMode.classList.remove('hidden')
    if (editMode instanceof HTMLElement) editMode.classList.add('hidden')
  }

  const showEdit = (): void => {
    if (viewMode instanceof HTMLElement) viewMode.classList.add('hidden')
    if (editMode instanceof HTMLElement) editMode.classList.remove('hidden')
  }

  if (toggleButton instanceof HTMLElement) toggleButton.addEventListener('click', showEdit)
  if (cancelButton instanceof HTMLElement) cancelButton.addEventListener('click', showView)

  if (starContainer instanceof HTMLElement && starValueInput instanceof HTMLInputElement) {
    let rating = parseInt(starValueInput.value, 10) || 0
    let hoverIndex: number | null = null

    const updateStarDisplay = (): void => {
      const stars = starContainer.querySelectorAll('.star-btn')
      stars.forEach((button) => {
        if (!(button instanceof HTMLElement)) return
        const value = parseInt(button.getAttribute('data-value') || '0', 10) || 0
        button.classList.remove('star-outlined', 'star-filled-primary', 'star-filled-secondary')
        if (hoverIndex !== null) {
          if (value <= rating) button.classList.add('star-filled-primary')
          else if (value <= hoverIndex) button.classList.add('star-filled-secondary')
          else button.classList.add('star-outlined')
          return
        }
        if (value <= rating) button.classList.add('star-filled-primary')
        else button.classList.add('star-outlined')
      })
    }

    updateStarDisplay()

    starContainer.querySelectorAll('.star-btn').forEach((button) => {
      if (!(button instanceof HTMLElement)) return
      button.addEventListener('click', () => {
        rating = parseInt(button.getAttribute('data-value') || '0', 10) || 0
        starValueInput.value = String(rating)
        hoverIndex = null
        updateStarDisplay()
      })
      button.addEventListener('mouseenter', () => {
        hoverIndex = parseInt(button.getAttribute('data-value') || '0', 10) || 0
        updateStarDisplay()
      })
    })

    starContainer.addEventListener('mouseleave', () => {
      hoverIndex = null
      updateStarDisplay()
    })
  }

  if (tagsInput instanceof HTMLInputElement && customTagsValue instanceof HTMLInputElement) {
    const badgesContainer =
      (section.querySelector('[data-tags-badges-container]') as HTMLElement | null) ||
      (tagsInput.parentElement instanceof HTMLElement ? tagsInput.parentElement : null)
    if (!badgesContainer) return

    const addTagsFromString = (value: string): void => {
      const parts = value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)

      let added = 0
      for (let index = 0; index < parts.length && currentTags.length < 10; index += 1) {
        const tag = parts[index].slice(0, 50)
        if (tag && !currentTags.includes(tag)) {
          currentTags.push(tag)
          added += 1
        }
      }

      if (added > 0) {
        customTagsValue.value = JSON.stringify(currentTags)
        renderTags()
      }
    }

    const renderTags = (): void => {
      badgesContainer.replaceChildren()
      currentTags.forEach((tag) => {
        const pill = document.createElement('span')
        pill.className =
          'tag-pill inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-sm text-primary'
        pill.setAttribute('data-tag', tag)

        const text = document.createElement('span')
        text.textContent = tag
        pill.appendChild(text)

        const removeButton = document.createElement('button')
        removeButton.type = 'button'
        removeButton.className =
          'tag-remove -mr-0.5 flex h-5 w-5 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary/25 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50'
        removeButton.setAttribute('aria-label', messages.removeTagAria.replace('{tag}', tag))
        removeButton.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
        removeButton.addEventListener('click', () => {
          currentTags = currentTags.filter((value) => value !== tag)
          customTagsValue.value = JSON.stringify(currentTags)
          renderTags()
        })

        pill.appendChild(removeButton)
        badgesContainer.appendChild(pill)
      })
    }

    renderTags()

    tagsInput.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault()
        const value = tagsInput.value.trim()
        if (value) {
          addTagsFromString(value)
          tagsInput.value = ''
        }
      }
    })
  }

  if (form instanceof HTMLFormElement) {
    form.addEventListener('submit', async (event: SubmitEvent) => {
      event.preventDefault()

      const formData = new FormData(form)
      const payload: Record<string, unknown> = {}

      const personalNotes = formData.get('personalNotes')
      const acquisitionDate = formData.get('acquisitionDate')
      const purchasePrice = formData.get('purchasePrice')
      const condition = formData.get('condition')
      const purchaseLocation = formData.get('purchaseLocation')
      const personalRating = formData.get('personalRating')

      if (personalNotes !== null) payload.personalNotes = personalNotes === '' ? null : String(personalNotes)
      if (acquisitionDate !== null) payload.acquisitionDate = acquisitionDate === '' ? null : String(acquisitionDate)
      if (purchasePrice !== null)
        payload.purchasePrice = purchasePrice === '' ? null : parseFloat(String(purchasePrice))
      if (condition !== null) payload.condition = condition === '' ? null : String(condition)
      if (purchaseLocation !== null)
        payload.purchaseLocation = purchaseLocation === '' ? null : String(purchaseLocation)
      if (personalRating !== null)
        payload.personalRating = personalRating === '' ? null : parseInt(String(personalRating), 10)
      payload.customTags = currentTags

      const submitButton = form.querySelector('button[type="submit"]')
      const originalText =
        submitButton instanceof HTMLElement ? submitButton.textContent || messages.saveLabel : messages.saveLabel

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true
        submitButton.textContent = messages.saving
      }

      try {
        const response = await fetch(`/api/items/${itemId}/personal-data`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string }
          throw new Error(errorData.error || messages.errorSaving)
        }

        const dataSavedMessage = section.dataset.dataSaved || 'Data saved'
        window.toast?.success(dataSavedMessage)
        window.location.reload()
      } catch (error) {
        const message = error instanceof Error ? error.message : messages.errorGeneric
        window.toast?.error(message)
      } finally {
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = false
          submitButton.textContent = originalText
        }
      }
    })
  }
}

onDomReady(initPersonalDataSection)
onAstroPageLoad(initPersonalDataSection)

