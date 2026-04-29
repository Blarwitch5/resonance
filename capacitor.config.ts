import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.resonance.app',
  appName: 'Resonance',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // In development, point to the local dev server
    // Remove this in production builds
    url: process.env.NODE_ENV === 'development' ? 'http://localhost:4321' : undefined,
    cleartext: process.env.NODE_ENV === 'development',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      // Camera plugin uses native camera picker
    },
  },
}

export default config
