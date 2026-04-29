// src/capacitor/push.ts
// Loaded client-side only — uses dynamic import to avoid SSR issues

export async function initPushNotifications() {
  // Only run in Capacitor native context
  if (typeof window === 'undefined') return
  if (!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) return

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    const permStatus = await PushNotifications.checkPermissions()

    if (permStatus.receive === 'prompt') {
      const result = await PushNotifications.requestPermissions()
      if (result.receive !== 'granted') return
    }

    if (permStatus.receive !== 'granted') return

    await PushNotifications.register()

    PushNotifications.addListener('registration', async (token) => {
      const platform = getPlatform()
      await fetch('/api/push-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.value, platform }),
      }).catch(() => {})
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err.error)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      // Navigate based on notification data
      const data = notification.notification.data as { url?: string } | undefined
      if (data?.url) {
        window.location.href = data.url
      }
    })
  } catch (err) {
    console.error('Push notification init error:', err)
  }
}

function getPlatform(): 'ios' | 'android' | 'web' {
  const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor
  const p = cap?.getPlatform?.()
  if (p === 'ios') return 'ios'
  if (p === 'android') return 'android'
  return 'web'
}
