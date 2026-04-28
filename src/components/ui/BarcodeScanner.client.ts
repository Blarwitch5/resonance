import { onAstroPageLoad, onDomReady, runOnce } from '../../scripts/client/runtime'

type BarcodeMessageMap = {
  noSupport: string
  cameraDenied: string
  cameraError: string
  albumFound: string
  albumNotFound: string
  searchError: string
  enterBarcode: string
}

type BarcodeDetectorResult = { rawValue: string }
type BarcodeDetectorInstance = {
  detect: (element: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>
}
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor
  }
}

let initialized = false
let stream: MediaStream | null = null
let detector: BarcodeDetectorInstance | null = null
let lastActiveElement: HTMLElement | null = null
let shouldDetect = false
let zxingControls: { stop?: () => void } | null = null
let isHandlingBarcode = false

const fallbackMessages: BarcodeMessageMap = {
  noSupport: 'Your browser does not support automatic scanning. Manual input is available.',
  cameraDenied: 'Camera access denied.',
  cameraError: 'Cannot access the camera.',
  albumFound: 'Album found!',
  albumNotFound: 'Album not found. Redirecting to explorer...',
  searchError: 'Search failed.',
  enterBarcode: 'Please enter a barcode.',
}

function getMessages(): BarcodeMessageMap {
  const element = getLatestElementById('barcode-scanner-messages')
  if (!element) return fallbackMessages

  try {
    const parsed = JSON.parse(element.textContent || '{}') as Partial<BarcodeMessageMap>
    return {
      noSupport: parsed.noSupport || fallbackMessages.noSupport,
      cameraDenied: parsed.cameraDenied || fallbackMessages.cameraDenied,
      cameraError: parsed.cameraError || fallbackMessages.cameraError,
      albumFound: parsed.albumFound || fallbackMessages.albumFound,
      albumNotFound: parsed.albumNotFound || fallbackMessages.albumNotFound,
      searchError: parsed.searchError || fallbackMessages.searchError,
      enterBarcode: parsed.enterBarcode || fallbackMessages.enterBarcode,
    }
  } catch {
    return fallbackMessages
  }
}

function getLatestElementById(elementId: string): HTMLElement | null {
  const elements = document.querySelectorAll(`#${elementId}`)
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index]
    if (element instanceof HTMLElement && element.isConnected) {
      return element
    }
  }
  return null
}

function rememberLastActiveElement() {
  if (!lastActiveElement && document.activeElement instanceof HTMLElement) {
    lastActiveElement = document.activeElement
  }
}

function restoreLastActiveElement() {
  if (lastActiveElement && typeof lastActiveElement.focus === 'function') lastActiveElement.focus()
  lastActiveElement = null
}

function openChoiceModal() {
  const choiceModal = getLatestElementById('barcode-choice-modal')
  rememberLastActiveElement()
  choiceModal?.setAttribute('data-open', 'true')
  choiceModal?.setAttribute('aria-hidden', 'false')
  getLatestElementById('barcode-choice-camera')?.focus()
}

function closeChoiceModal() {
  const choiceModal = getLatestElementById('barcode-choice-modal')
  choiceModal?.setAttribute('data-open', 'false')
  choiceModal?.setAttribute('aria-hidden', 'true')
  restoreLastActiveElement()
}

function openManualModal() {
  const manualModal = getLatestElementById('barcode-manual-modal')
  const manualInput = getLatestElementById('barcode-manual-input')
  const manualError = getLatestElementById('barcode-manual-error')
  rememberLastActiveElement()
  manualModal?.setAttribute('data-open', 'true')
  manualModal?.setAttribute('aria-hidden', 'false')
  if (manualInput instanceof HTMLInputElement) {
    manualInput.value = ''
    manualInput.focus()
  }
  if (manualError instanceof HTMLElement) {
    manualError.classList.add('hidden')
    manualError.textContent = ''
  }
}

function closeManualModal() {
  const manualModal = getLatestElementById('barcode-manual-modal')
  manualModal?.setAttribute('data-open', 'false')
  manualModal?.setAttribute('aria-hidden', 'true')
  restoreLastActiveElement()
}

function closeScanner() {
  shouldDetect = false
  if (zxingControls?.stop) {
    try {
      zxingControls.stop()
    } catch {
      // no-op
    }
  }
  zxingControls = null
  isHandlingBarcode = false
  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }
  const video = getLatestElementById('scanner-video')
  const scannerModal = getLatestElementById('barcode-scanner-modal')
  const scannerResult = getLatestElementById('scanner-result')
  if (video instanceof HTMLVideoElement) video.srcObject = null
  scannerModal?.setAttribute('data-open', 'false')
  scannerModal?.setAttribute('aria-hidden', 'true')
  scannerResult?.classList.add('hidden')
  restoreLastActiveElement()
}

async function handleBarcodeDetected(barcodeValue: string) {
  const messages = getMessages()
  const scannedBarcode = getLatestElementById('scanned-barcode')
  const scannerResult = getLatestElementById('scanner-result')
  if (scannedBarcode) scannedBarcode.textContent = barcodeValue
  scannerResult?.classList.remove('hidden')

  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    stream = null
  }

  try {
    const response = await fetch(`/api/discogs/search-by-barcode?barcode=${encodeURIComponent(barcodeValue)}`)
    if (!response.ok) throw new Error('Search failed')
    const data = await response.json() as { found?: boolean; result?: { id: number } }

    if (data.found && data.result) {
      const modal = getLatestElementById('add-to-collection-modal')
      if (modal) {
        modal.setAttribute('data-discogs-id', data.result.id.toString())
        modal.classList.remove('hidden')
        closeScanner()
        window.toast?.success(messages.albumFound)
      } else {
        closeScanner()
        window.location.href = `/explore/${data.result.id}`
      }
      return
    }

    window.toast?.info(messages.albumNotFound)
    setTimeout(() => {
      window.location.href = `/explore`
      closeScanner()
    }, 2000)
  } catch {
    window.toast?.error(messages.searchError)
    setTimeout(() => {
      window.location.href = `/explore`
      closeScanner()
    }, 2000)
  }
}

function startNativeDetection(videoElement: HTMLVideoElement) {
  if (!detector) return

  const detectLoop = async () => {
    try {
      if (!detector || !shouldDetect) return
      const barcodes = await detector.detect(videoElement)
      if (barcodes.length > 0) {
        await handleBarcodeDetected(barcodes[0].rawValue)
        return
      }
    } catch {
      // noop
    }
    if (shouldDetect) requestAnimationFrame(detectLoop)
  }

  videoElement.addEventListener('loadedmetadata', () => {
    void detectLoop()
  }, { once: true })
}

async function runCameraFlow() {
  const messages = getMessages()
  const video = getLatestElementById('scanner-video')
  const scannerModal = getLatestElementById('barcode-scanner-modal')
  if (!(video instanceof HTMLVideoElement) || !(scannerModal instanceof HTMLElement)) return

  try {
    const constraints: MediaStreamConstraints[] = [
      { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
    ]

    let lastError: unknown = null
    for (const value of constraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(value)
        break
      } catch (error) {
        lastError = error
      }
    }

    if (!stream) throw lastError ?? new Error('Camera denied')
    shouldDetect = true
    video.srcObject = stream
    scannerModal.setAttribute('data-open', 'true')
    scannerModal.setAttribute('aria-hidden', 'false')
    rememberLastActiveElement()
    getLatestElementById('close-scanner')?.focus()

    if (window.BarcodeDetector) {
      detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      })
      startNativeDetection(video)
    } else {
      try {
        try {
          if (video.paused) await video.play()
        } catch {
          // Autoplay peut être bloqué dans certains cas, on laisse tenter quand même.
        }

        const ZXingBrowserModule = (await import('https://esm.sh/@zxing/browser@0.1.5')) as any
        const BrowserMultiFormatReader = ZXingBrowserModule?.BrowserMultiFormatReader
        if (!BrowserMultiFormatReader) throw new Error('ZXing reader unavailable')

        const reader = new BrowserMultiFormatReader()
        const maybeText = (value: unknown): string | null => {
          if (typeof value === 'string') return value
          if (value && typeof (value as any).getText === 'function') return (value as any).getText()
          if (value && typeof (value as any).text === 'string') return (value as any).text
          return null
        }

        zxingControls = await reader.decodeFromVideoElement(video, (result: any, _error: unknown, controls: any) => {
          if (isHandlingBarcode) return
          const text = maybeText(result)
          if (!text) return

          isHandlingBarcode = true
          try {
            controls?.stop?.()
          } catch {
            // no-op
          }

          void handleBarcodeDetected(text)
        })
      } catch (error) {
        console.error('ZXing fallback failed:', error)
        window.toast?.info(messages.noSupport)
        closeScanner()
        openManualModal()
      }
    }
  } catch (error) {
    const value = error as { name?: string; message?: string } | undefined
    const isDenied = value?.name === 'NotAllowedError'
      || (typeof value?.message === 'string' && value.message.includes('Permission denied'))
    window.toast?.error(isDenied ? messages.cameraDenied : messages.cameraError)
    openManualModal()
  }
}

function initListeners() {
  document.addEventListener('click', (event) => {
    const target = event.target
    // Le clic peut viser des sous-éléments SVG (svg/path), qui ne sont pas des HTMLElement.
    // On utilise Element pour que `closest()` fonctionne correctement.
    if (!(target instanceof Element)) return

    if (target.closest('#barcode-scanner-btn')) {
      event.preventDefault()
      openChoiceModal()
      return
    }

    if (target.closest('#barcode-choice-camera')) {
      event.preventDefault()
      closeChoiceModal()
      void runCameraFlow()
      return
    }

    if (target.closest('#barcode-choice-manual')) {
      event.preventDefault()
      closeChoiceModal()
      openManualModal()
      return
    }

    if (target.closest('#barcode-choice-close') || target.id === 'barcode-choice-modal') {
      event.preventDefault()
      closeChoiceModal()
      return
    }

    if (target.closest('#barcode-manual-submit')) {
      event.preventDefault()
      const messages = getMessages()
      const manualInput = getLatestElementById('barcode-manual-input')
      const manualError = getLatestElementById('barcode-manual-error')
      const value = manualInput instanceof HTMLInputElement ? manualInput.value.trim() : ''
      if (!value) {
        if (manualError instanceof HTMLElement) {
          manualError.textContent = messages.enterBarcode
          manualError.classList.remove('hidden')
        }
        return
      }
      closeManualModal()
      window.location.href = `/explore`
      return
    }

    if (target.closest('#barcode-manual-cancel') || target.id === 'barcode-manual-modal') {
      event.preventDefault()
      closeManualModal()
      return
    }

    if (target.closest('#close-scanner') || target.id === 'barcode-scanner-modal') {
      event.preventDefault()
      closeScanner()
    }
  })

  document.addEventListener('keydown', (event) => {
    const target = event.target
    if (target instanceof HTMLElement && target.id === 'barcode-manual-input' && event.key === 'Enter') {
      event.preventDefault()
      getLatestElementById('barcode-manual-submit')?.click()
      return
    }

    if (event.key === 'Escape') {
      const choiceModal = getLatestElementById('barcode-choice-modal')
      const manualModal = getLatestElementById('barcode-manual-modal')
      const scannerModal = getLatestElementById('barcode-scanner-modal')
      if (choiceModal?.getAttribute('data-open') === 'true') closeChoiceModal()
      else if (manualModal?.getAttribute('data-open') === 'true') closeManualModal()
      else if (scannerModal?.getAttribute('data-open') === 'true') closeScanner()
    }
  })
}

function resetScannerModals(): void {
  const modalIds = ['barcode-choice-modal', 'barcode-manual-modal', 'barcode-scanner-modal']
  for (const modalId of modalIds) {
    const allModals = document.querySelectorAll(`#${modalId}`)
    allModals.forEach((modal) => {
      if (modal instanceof HTMLElement) {
        modal.setAttribute('data-open', 'false')
        modal.setAttribute('aria-hidden', 'true')
      }
    })
  }
  const scannerResult = getLatestElementById('scanner-result')
  scannerResult?.classList.add('hidden')
}

function initBarcodeScanner() {
  if (initialized) return
  initialized = true
  resetScannerModals()
  initListeners()
}

runOnce('barcode-scanner', () => {
  onDomReady(initBarcodeScanner)
  onAstroPageLoad(() => {
    closeScanner()
    resetScannerModals()
  })
})
