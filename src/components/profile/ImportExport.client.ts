import { onAstroPageLoad, onDomReady } from '../../scripts/client/runtime'

type ImportExportMessages = {
  exporting?: string
  exportSuccess?: string
  exportError?: string
  importing?: string
  importSuccess?: string
  importError?: string
}

function getMessages(): Required<ImportExportMessages> {
  const fallback: Required<ImportExportMessages> = {
    exporting: 'Exporting...',
    exportSuccess: 'Exported',
    exportError: 'Export error',
    importing: 'Importing...',
    importSuccess: 'Import done',
    importError: 'Import error',
  }

  const element = document.getElementById('import-export-messages')
  if (!element?.textContent) return fallback
  try {
    const parsed = JSON.parse(element.textContent) as ImportExportMessages
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

function initImportExport(): void {
  const exportButton = document.getElementById('export-btn')
  const importFile = document.getElementById('import-file')
  if (!(exportButton instanceof HTMLButtonElement)) return
  if (exportButton.dataset.initialized === 'true') return
  exportButton.dataset.initialized = 'true'

  const messages = getMessages()

  exportButton.addEventListener('click', async () => {
    window.setButtonLoading?.(exportButton, true, messages.exporting)
    try {
      const response = await fetch('/api/collections/export')
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `resonance-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      window.toast?.success(messages.exportSuccess)
    } catch (error) {
      console.error('Export error:', error)
      window.toast?.error(messages.exportError)
    } finally {
      window.setButtonLoading?.(exportButton, false)
    }
  })

  if (importFile instanceof HTMLInputElement) {
    importFile.addEventListener('change', async () => {
      const file = importFile.files?.[0]
      if (!file) return

      const formData = new FormData()
      formData.append('file', file)

      window.toast?.info(messages.importing, 5000)

      try {
        const response = await fetch('/api/collections/import', { method: 'POST', body: formData })
        const data = (await response.json()) as {
          error?: string
          stats?: { collectionsCreated: number; itemsCreated: number; itemsSkipped: number }
        }

        if (response.ok && data.stats) {
          const message = messages.importSuccess
            .replace('{collectionsCreated}', String(data.stats.collectionsCreated))
            .replace('{itemsCreated}', String(data.stats.itemsCreated))
            .replace('{itemsSkipped}', String(data.stats.itemsSkipped))
          window.toast?.success(message, 8000)
          setTimeout(() => window.location.reload(), 1000)
          return
        }

        window.toast?.error(data.error || messages.importError)
      } catch (error) {
        console.error('Import error:', error)
        window.toast?.error(messages.importError)
      } finally {
        importFile.value = ''
      }
    })
  }
}

onDomReady(initImportExport)
onAstroPageLoad(initImportExport)
