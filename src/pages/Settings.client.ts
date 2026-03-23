// @ts-nocheck

import { onDomReady, runOnce } from '../scripts/client/runtime'

runOnce('settings-page', () => onDomReady(() => {
;(function () {
  function withCacheBust(url, key = 'r') {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${key}=${Date.now()}`
  }

  async function waitForImageAvailability(url, maxAttempts = 8, delayMs = 200) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidateUrl = withCacheBust(url)
      const isLoaded = await new Promise((resolve) => {
        const image = new Image()
        image.onload = () => resolve(true)
        image.onerror = () => resolve(false)
        image.src = candidateUrl
      })
      if (isLoaded) return candidateUrl
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    return withCacheBust(url)
  }

  let msg = {}
  let account = {}
  try {
    const messagesElement = document.getElementById('settings-page-messages')
    if (messagesElement && messagesElement.textContent) {
      const parsed = JSON.parse(messagesElement.textContent)
      msg = parsed.script || {}
      account = parsed.account || {}
    }
  } catch (error) {
    console.warn('Could not parse settings-page-messages', error)
  }
  const avatarUpload = document.getElementById('avatar-upload')
  if (avatarUpload) {
    avatarUpload.addEventListener('change', async function (event) {
      const target = event.target
      const file = target.files?.[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) {
        if (window.toast) window.toast.error(msg.fileTooLarge)
        return
      }
      if (window.toast) window.toast.info(msg.uploadingAvatar, 2000)
      const formData = new FormData()
      formData.append('avatar', file)
      try {
        const response = await fetch('/api/profile/upload-avatar', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
        const data = await response.json()
        if (response.ok && data.imageUrl) {
          if (window.toast) window.toast.success(msg.avatarUpdated)
          const newSrc = await waitForImageAvailability(data.imageUrl)
          const container = document.getElementById('user-avatar-container')
          if (!container) return
          function setImgSrc(img, src) {
            img.removeAttribute('src')
            img.src = src
            img.style.display = ''
            img.removeAttribute('hidden')
          }
          const avatarImg = container.querySelector('img')
          if (avatarImg) {
            setImgSrc(avatarImg, newSrc)
            const initialsDiv = container.querySelector('.bg-gradient-resonance')
            if (initialsDiv) {
              initialsDiv.classList.add('hidden')
              initialsDiv.style.display = 'none'
            }
          } else {
            container.querySelectorAll('img').forEach((el) => el.remove())
            const initialsDiv = container.querySelector('.bg-gradient-resonance')
            const img = document.createElement('img')
            img.id = 'user-avatar-img'
            img.setAttribute('data-user-avatar', 'true')
            img.src = newSrc
            img.alt = 'Avatar'
            img.className = 'h-16 w-16 rounded-full object-cover'
            img.width = 64
            img.height = 64
            img.onerror = function () {
              img.style.display = 'none'
              if (initialsDiv) initialsDiv.style.display = 'flex'
            }
            container.insertBefore(img, container.firstChild)
            if (initialsDiv) {
              initialsDiv.classList.add('hidden')
              initialsDiv.style.display = 'none'
            }
          }
          document.querySelectorAll('img[data-user-avatar="true"]').forEach((el) => setImgSrc(el, newSrc))
        } else if (window.toast) {
          window.toast.error(data.error || msg.avatarError)
        }
      } catch (error) {
        console.error('Avatar upload error:', error)
        if (window.toast) window.toast.error(msg.avatarError)
      } finally {
        target.value = ''
      }
    })
  }

  const exportBtn = document.getElementById('export-data-btn')
  if (exportBtn) {
    exportBtn.addEventListener('click', async function () {
      const button = exportBtn
      const originalText = button.textContent || ''
      button.disabled = true
      button.textContent = msg.exporting
      try {
        const response = await fetch('/api/collections/export')
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const downloadLink = document.createElement('a')
          downloadLink.href = url
          downloadLink.download = `resonance-export-${new Date().toISOString().split('T')[0]}.json`
          document.body.appendChild(downloadLink)
          downloadLink.click()
          document.body.removeChild(downloadLink)
          window.URL.revokeObjectURL(url)
          if (window.toast) window.toast.success(msg.exportSuccess)
        } else {
          throw new Error(msg.exportError)
        }
      } catch (error) {
        console.error('Export error:', error)
        if (window.toast) window.toast.error(msg.exportError)
      } finally {
        button.disabled = false
        button.textContent = originalText
      }
    })
  }

  const deleteAllBtn = document.getElementById('delete-all-data-btn')
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', async function () {
      const confirmed = await window.confirmDialog?.(
        msg.deleteAllConfirmTitle,
        msg.deleteAllConfirmMessage,
        msg.deleteAllConfirmButton,
        msg.cancel,
      )
      if (!confirmed) return
      const button = deleteAllBtn
      const originalText = button.textContent || ''
      button.disabled = true
      button.textContent = msg.deleting
      try {
        const response = await fetch('/api/dev/purge-collections', { method: 'DELETE' })
        if (response.ok) {
          if (window.toast) window.toast.success(msg.allDataDeleted)
          setTimeout(function () {
            window.location.href = '/collections'
          }, 1000)
        } else {
          throw new Error(msg.deleteDataError)
        }
      } catch (error) {
        console.error('Delete error:', error)
        if (window.toast) window.toast.error(msg.deleteDataError)
      } finally {
        button.disabled = false
        button.textContent = originalText
      }
    })
  }

  const nameInput = document.getElementById('profile-name')
  const editNameBtn = document.getElementById('edit-name-btn')
  const saveNameBtn = document.getElementById('save-name-btn')
  const cancelNameBtn = document.getElementById('cancel-name-btn')
  let originalName = nameInput?.value || ''
  if (editNameBtn && nameInput && saveNameBtn && cancelNameBtn) {
    editNameBtn.addEventListener('click', function () {
      originalName = nameInput.value
      nameInput.removeAttribute('readonly')
      nameInput.classList.remove('read-only:cursor-default', 'read-only:opacity-75')
      nameInput.focus()
      editNameBtn.classList.add('hidden')
      saveNameBtn.classList.remove('hidden')
      cancelNameBtn.classList.remove('hidden')
    })
    cancelNameBtn.addEventListener('click', function () {
      nameInput.value = originalName
      nameInput.setAttribute('readonly', '')
      nameInput.classList.add('read-only:cursor-default', 'read-only:opacity-75')
      editNameBtn.classList.remove('hidden')
      saveNameBtn.classList.add('hidden')
      cancelNameBtn.classList.add('hidden')
    })
    saveNameBtn.addEventListener('click', async function () {
      const name = nameInput.value.trim()
      if (name === originalName) {
        cancelNameBtn.click()
        return
      }
      if (window.setButtonLoading) window.setButtonLoading(saveNameBtn, true, '')
      try {
        const response = await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const data = await response.json()
        if (response.ok) {
          if (window.toast) window.toast.success(msg.nameUpdated)
          originalName = name
          nameInput.setAttribute('readonly', '')
          nameInput.classList.add('read-only:cursor-default', 'read-only:opacity-75')
          editNameBtn.classList.remove('hidden')
          saveNameBtn.classList.add('hidden')
          cancelNameBtn.classList.add('hidden')
        } else {
          if (window.toast) window.toast.error(data.error || msg.nameError)
          nameInput.value = originalName
        }
      } catch (error) {
        console.error('Name update error:', error)
        if (window.toast) window.toast.error(msg.nameError)
        nameInput.value = originalName
      } finally {
        if (window.setButtonLoading) window.setButtonLoading(saveNameBtn, false)
      }
    })
  }

  const emailInput = document.getElementById('profile-email')
  const editEmailBtn = document.getElementById('edit-email-btn')
  const saveEmailBtn = document.getElementById('save-email-btn')
  const cancelEmailBtn = document.getElementById('cancel-email-btn')
  let originalEmail = emailInput?.value || ''
  if (editEmailBtn && emailInput && saveEmailBtn && cancelEmailBtn) {
    editEmailBtn.addEventListener('click', function () {
      originalEmail = emailInput.value
      emailInput.removeAttribute('readonly')
      emailInput.classList.remove('read-only:cursor-default', 'read-only:opacity-75')
      emailInput.focus()
      editEmailBtn.classList.add('hidden')
      saveEmailBtn.classList.remove('hidden')
      cancelEmailBtn.classList.remove('hidden')
    })
    cancelEmailBtn.addEventListener('click', function () {
      emailInput.value = originalEmail
      emailInput.setAttribute('readonly', '')
      emailInput.classList.add('read-only:cursor-default', 'read-only:opacity-75')
      editEmailBtn.classList.remove('hidden')
      saveEmailBtn.classList.add('hidden')
      cancelEmailBtn.classList.add('hidden')
    })
    saveEmailBtn.addEventListener('click', async function () {
      const email = emailInput.value.trim().toLowerCase()
      if (email === originalEmail) {
        cancelEmailBtn.click()
        return
      }
      if (!email.includes('@')) {
        if (window.toast) window.toast.error(msg.validEmail)
        return
      }
      if (window.setButtonLoading) window.setButtonLoading(saveEmailBtn, true, '')
      try {
        const response = await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        const data = await response.json()
        if (response.ok) {
          if (window.toast) window.toast.success(msg.emailUpdated)
          originalEmail = email
          emailInput.setAttribute('readonly', '')
          emailInput.classList.add('read-only:cursor-default', 'read-only:opacity-75')
          editEmailBtn.classList.remove('hidden')
          saveEmailBtn.classList.add('hidden')
          cancelEmailBtn.classList.add('hidden')
        } else {
          if (window.toast) window.toast.error(data.error || msg.emailError)
          emailInput.value = originalEmail
        }
      } catch (error) {
        console.error('Email update error:', error)
        if (window.toast) window.toast.error(msg.emailError)
        emailInput.value = originalEmail
      } finally {
        if (window.setButtonLoading) window.setButtonLoading(saveEmailBtn, false)
      }
    })
  }

  const showPasswordFormBtn = document.getElementById('show-password-form-btn')
  const passwordForm = document.getElementById('password-form')
  const cancelPasswordBtn = document.getElementById('cancel-password-btn')
  const passwordError = document.getElementById('password-error')
  if (showPasswordFormBtn && passwordForm) {
    showPasswordFormBtn.addEventListener('click', function () {
      passwordForm.classList.remove('hidden')
      showPasswordFormBtn.classList.add('hidden')
      if (passwordError) {
        passwordError.classList.add('hidden')
        passwordError.textContent = ''
      }
    })
  }
  if (cancelPasswordBtn && passwordForm && showPasswordFormBtn) {
    cancelPasswordBtn.addEventListener('click', function () {
      passwordForm.classList.add('hidden')
      showPasswordFormBtn.classList.remove('hidden')
      passwordForm.reset()
      if (passwordError) {
        passwordError.classList.add('hidden')
        passwordError.textContent = ''
      }
    })
  }

  function bindPasswordToggle(inputId, toggleBtnId, eyeId, eyeOffId, ariaLabelShow, ariaLabelHide) {
    const input = document.getElementById(inputId)
    const btn = document.getElementById(toggleBtnId)
    const eye = document.getElementById(eyeId)
    const eyeOff = document.getElementById(eyeOffId)
    if (!input || !btn) return
    btn.addEventListener('click', function () {
      const isPassword = input.type === 'password'
      input.type = isPassword ? 'text' : 'password'
      if (eye && eyeOff) {
        if (isPassword) {
          eye.classList.remove('hidden')
          eyeOff.classList.add('hidden')
          btn.setAttribute('aria-label', ariaLabelHide)
        } else {
          eye.classList.add('hidden')
          eyeOff.classList.remove('hidden')
          btn.setAttribute('aria-label', ariaLabelShow)
        }
      }
    })
  }
  bindPasswordToggle(
    'current-password',
    'toggle-current-password',
    'eye-current',
    'eye-off-current',
    account.showCurrentPassword,
    account.hideCurrentPassword,
  )
  bindPasswordToggle(
    'new-password',
    'toggle-new-password',
    'eye-new',
    'eye-off-new',
    account.showNewPassword,
    account.hideNewPassword,
  )
  bindPasswordToggle(
    'confirm-password',
    'toggle-confirm-password',
    'eye-confirm',
    'eye-off-confirm',
    account.showConfirmPassword,
    account.hideConfirmPassword,
  )

  const savePasswordBtn = document.getElementById('save-password-btn')
  const passwordMatch = document.getElementById('password-match')
  if (passwordForm && savePasswordBtn && passwordError) {
    passwordForm.addEventListener('submit', async function (event) {
      event.preventDefault()
      const currentPassword = document.getElementById('current-password')?.value?.trim()
      const newPassword = document.getElementById('new-password')?.value?.trim()
      const confirmPassword = document.getElementById('confirm-password')?.value?.trim()
      if (!currentPassword || !newPassword || !confirmPassword) {
        if (window.toast) window.toast.error(msg.fillRequired)
        return
      }
      if (newPassword !== confirmPassword) {
        if (passwordMatch) passwordMatch.textContent = msg.passwordMismatch
        if (window.toast) window.toast.error(msg.passwordMismatch)
        return
      }
      if (window.setButtonLoading) window.setButtonLoading(savePasswordBtn, true, msg.changing)
      try {
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ currentPassword, newPassword }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          const message = data.error || data.message || msg.changePasswordError
          if (passwordError) {
            passwordError.textContent = message
            passwordError.classList.remove('hidden')
          }
          if (window.toast) window.toast.error(message)
          return
        }
        if (window.toast) window.toast.success(msg.passwordUpdated)
        passwordForm.reset()
        if (passwordMatch) passwordMatch.textContent = ''
        if (passwordError) {
          passwordError.classList.add('hidden')
          passwordError.textContent = ''
        }
        passwordForm.classList.add('hidden')
        if (showPasswordFormBtn) showPasswordFormBtn.classList.remove('hidden')
      } catch (error) {
        console.error(error)
        if (passwordError) {
          passwordError.textContent = error instanceof Error ? error.message : msg.unexpectedError
          passwordError.classList.remove('hidden')
        }
        if (window.toast) window.toast.error(msg.changePasswordError)
      } finally {
        if (window.setButtonLoading) window.setButtonLoading(savePasswordBtn, false)
      }
    })
  }

  const deleteAccountBtn = document.getElementById('delete-account-btn')
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async function () {
      const confirmed = await window.confirmDialog?.(
        msg.deleteAccountConfirmTitle,
        msg.deleteAccountConfirmMessage,
        msg.deleteAccountConfirmButton,
        msg.cancel,
      )
      if (!confirmed) return
      const doubleConfirmed = await window.confirmDialog?.(
        msg.deleteAccountFinalTitle,
        msg.deleteAccountFinalMessage,
        msg.deleteAccountFinalButton,
        msg.cancel,
      )
      if (!doubleConfirmed) return
      const button = deleteAccountBtn
      const originalText = button.textContent || ''
      button.disabled = true
      button.textContent = msg.deleting
      try {
        const response = await fetch('/api/profile/delete-account', { method: 'DELETE' })
        if (response.ok) {
          if (window.toast) window.toast.success(msg.accountDeleted, 3000)
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        } else {
          const data = await response.json()
          throw new Error(data.error || msg.deleteAccountError)
        }
      } catch (error) {
        console.error('Delete account error:', error)
        if (window.toast) {
          window.toast.error(msg.deleteAccountError + ': ' + (error instanceof Error ? error.message : msg.unknownError))
        }
        button.disabled = false
        button.textContent = originalText
      }
    })
  }

  document.addEventListener('themeChanged', function (event) {
    const theme = event.detail && event.detail.theme
    if (window.toast && theme) {
      window.toast.success(theme === 'dark' ? msg.themeDarkLabel : msg.themeLightLabel)
    }
  })
})()
}))
