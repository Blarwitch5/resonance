import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'

type EditCollectionMessages = {
  savingLabel: string
  updatedSuccessMsg: string
  errorUpdatingMsg: string
  errorGenericMsg: string
  deleteTitleLabel: string
  deleteMessageTemplate: string
  deleteConfirmLabel: string
  deleteCancelLabel: string
  deletingLabel: string
  deletedSuccessMsg: string
  errorDeletingMsg: string
  coverFileTooLargeMsg: string
  coverUploadErrorMsg: string
}

function parseMessages(): EditCollectionMessages {
  const fallback: EditCollectionMessages = {
    savingLabel: 'Saving...',
    updatedSuccessMsg: 'Updated',
    errorUpdatingMsg: 'Error while updating',
    errorGenericMsg: 'Error',
    deleteTitleLabel: 'Delete',
    deleteMessageTemplate: 'Delete {name}?',
    deleteConfirmLabel: 'Delete',
    deleteCancelLabel: 'Cancel',
    deletingLabel: 'Deleting...',
    deletedSuccessMsg: 'Deleted',
    errorDeletingMsg: 'Error while deleting',
    coverFileTooLargeMsg: 'File too large',
    coverUploadErrorMsg: 'Cover upload error',
  }

  const element = document.getElementById('edit-collection-messages')
  if (!element?.textContent) return fallback
  try {
    const parsed = JSON.parse(element.textContent) as Partial<EditCollectionMessages>
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

function initCollectionHeader(): void {
  const editButton = document.getElementById('edit-collection-btn')
  const deleteButton = document.getElementById('delete-collection-btn')
  const editModal = document.getElementById('edit-collection-modal')
  const editForm = document.getElementById('edit-collection-form')

  if (!(editButton instanceof HTMLElement) || !(deleteButton instanceof HTMLElement)) return
  if (!(editModal instanceof HTMLElement) || !(editForm instanceof HTMLFormElement)) return
  if (editModal.dataset.initialized === 'true') return
  editModal.dataset.initialized = 'true'

  const messages = parseMessages()
  const collectionId = editButton.dataset.collectionId
  const collectionName = deleteButton.dataset.collectionName || ''
  if (!collectionId) return

  const cancelEditButton = document.getElementById('cancel-edit-btn')
  const editNameInput = document.getElementById('edit-name')
  const editDescriptionInput = document.getElementById('edit-description')
  const editCoverUpload = document.getElementById('edit-cover-upload')
  const editCoverRemove = document.getElementById('edit-cover-remove')
  const editCoverPreviewWrapper = document.getElementById('edit-cover-preview-wrapper')
  const editCoverPreview = document.getElementById('edit-cover-preview')

  let pendingCoverUrl: string | null = null

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  const maxSizeBytes = 5 * 1024 * 1024

  const syncCoverPreview = (): void => {
    if (!(editCoverPreview instanceof HTMLImageElement)) return
    if (!(editCoverPreviewWrapper instanceof HTMLElement)) return
    if (pendingCoverUrl) {
      editCoverPreview.src = pendingCoverUrl
      editCoverPreview.alt = 'Cover preview'
      editCoverPreviewWrapper.classList.remove('hidden')
    } else {
      editCoverPreview.src = ''
      editCoverPreviewWrapper.classList.add('hidden')
    }
  }

  const loadCollectionData = (): void => {
    const nameElement = document.querySelector('h1.text-3xl')
    const descElement = document.querySelector('p.text-muted')

    if (nameElement && editNameInput instanceof HTMLInputElement) {
      editNameInput.value = nameElement.textContent || ''
    }
    if (descElement && editDescriptionInput instanceof HTMLTextAreaElement) {
      editDescriptionInput.value = descElement.textContent || ''
    }
    pendingCoverUrl = editForm.dataset.initialCover || null
    if (editCoverUpload instanceof HTMLInputElement) editCoverUpload.value = ''
    syncCoverPreview()
  }

  const openModal = (): void => {
    loadCollectionData()
    editModal.classList.remove('hidden')
    editModal.classList.add('flex')
  }

  const closeModal = (): void => {
    editModal.classList.add('hidden')
    editModal.classList.remove('flex')
  }

  editButton.addEventListener('click', openModal)
  if (cancelEditButton instanceof HTMLElement) cancelEditButton.addEventListener('click', closeModal)
  editModal.addEventListener('click', (event: MouseEvent) => {
    if (event.target === editModal) closeModal()
  })

  if (editCoverUpload instanceof HTMLInputElement) {
    editCoverUpload.addEventListener('change', async () => {
      const file = editCoverUpload.files?.[0]
      if (!file) return

      if (!allowedTypes.includes(file.type)) {
        window.toast?.error(messages.coverUploadErrorMsg)
        editCoverUpload.value = ''
        return
      }
      if (file.size > maxSizeBytes) {
        window.toast?.error(messages.coverFileTooLargeMsg)
        editCoverUpload.value = ''
        return
      }

      const formData = new FormData()
      formData.append('cover', file)

      try {
        const response = await fetch('/api/collections/upload-cover', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        const data = (await response.json()) as { imageUrl?: string; error?: string }
        if (response.ok && data.imageUrl) {
          pendingCoverUrl = data.imageUrl
          syncCoverPreview()
          return
        }
        window.toast?.error(data.error || messages.coverUploadErrorMsg)
        editCoverUpload.value = ''
      } catch (error) {
        console.error('Cover upload error', error)
        window.toast?.error(messages.coverUploadErrorMsg)
        editCoverUpload.value = ''
      }
    })
  }

  if (editCoverRemove instanceof HTMLElement) {
    editCoverRemove.addEventListener('click', () => {
      pendingCoverUrl = null
      if (editCoverUpload instanceof HTMLInputElement) editCoverUpload.value = ''
      syncCoverPreview()
    })
  }

  editForm.addEventListener('submit', async (event: SubmitEvent) => {
    event.preventDefault()

    const formData = new FormData(editForm)
    const payload = {
      name: formData.get('name'),
      description: formData.get('description') || null,
      coverImage: pendingCoverUrl,
    }

    const submitButton = editForm.querySelector('button[type="submit"]')
    const originalText = submitButton instanceof HTMLElement ? submitButton.textContent || '' : ''
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true
      submitButton.textContent = messages.savingLabel
    }

    try {
      const response = await fetch(`/api/collections/${collectionId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const responseData = (await response.json()) as { error?: string }
      if (response.ok) {
        window.toast?.success(messages.updatedSuccessMsg)
        setTimeout(() => window.location.reload(), 500)
        return
      }
      window.toast?.error(responseData.error || messages.errorUpdatingMsg)
    } catch (error) {
      console.error('Error updating collection:', error)
      window.toast?.error(messages.errorGenericMsg)
    } finally {
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false
        submitButton.textContent = originalText
      }
    }
  })

  deleteButton.addEventListener('click', async () => {
    const deleteMessage = messages.deleteMessageTemplate.replace('{name}', collectionName)
    const confirmed = await window.confirmDialog?.(
      messages.deleteTitleLabel,
      deleteMessage,
      messages.deleteConfirmLabel,
      messages.deleteCancelLabel
    )
    if (!confirmed) return

    const originalText = deleteButton.textContent || ''
    if (deleteButton instanceof HTMLButtonElement) {
      deleteButton.disabled = true
      deleteButton.textContent = messages.deletingLabel
    }

    try {
      const response = await fetch(`/api/collections/${collectionId}/delete`, { method: 'DELETE' })
      if (response.ok || response.status === 204) {
        window.toast?.success(messages.deletedSuccessMsg)
        setTimeout(() => {
          window.location.href = '/collections'
        }, 500)
        return
      }
      const responseData = (await response.json()) as { error?: string }
      window.toast?.error(responseData.error || messages.errorDeletingMsg)
    } catch (error) {
      console.error('Error deleting collection:', error)
      window.toast?.error(messages.errorGenericMsg)
    } finally {
      if (deleteButton instanceof HTMLButtonElement) {
        deleteButton.disabled = false
        deleteButton.textContent = originalText
      }
    }
  })
}

onDomReady(initCollectionHeader)
onAstroPageLoad(initCollectionHeader)

