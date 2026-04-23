/// <reference types="astro/client" />

declare namespace App {
  // Note: 'import {} from ""' syntax does not work in .d.ts files.
  type AppUser = import('better-auth').User & { imageUrl?: string | null; username?: string | null }

  interface Locals {
    user: AppUser | null
    session: import('better-auth').Session | null
    userPreferences?: { theme?: string; locale?: string }
  }
}

// Extend Window interface for global functions
interface Window {
  toast?: {
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
    info: (message: string, duration?: number) => void
    warning: (message: string, duration?: number) => void
  }
  showToast?: (options: { type?: 'success' | 'error' | 'info' | 'warning'; message: string; duration?: number }) => void
  confirmDialog?: (title: string, message: string, confirmText?: string, cancelText?: string) => Promise<boolean>
  setButtonLoading?: (button: HTMLElement, isLoading: boolean, originalText?: string) => void
  createSpinner?: () => HTMLElement
}
