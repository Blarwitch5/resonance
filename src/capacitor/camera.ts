// src/capacitor/camera.ts
// Client-side only

export async function scanBarcode(): Promise<string | null> {
  const isNative =
    typeof window !== 'undefined' &&
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

  if (isNative) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      })
      // Return the base64 data URL for use with the web barcode decoder
      return photo.dataUrl ?? null
    } catch {
      // User cancelled or camera permission denied — silent fail
      return null
    }
  }

  // Fallback: web camera via existing BarcodeScanner component
  // The BarcodeScanner component handles its own initialization
  return null
}
