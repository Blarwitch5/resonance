type InitFn = () => void

/**
 * Run once when DOM is ready.
 * Safe to call multiple times; will run immediately if DOM already ready.
 */
export function onDomReady(init: InitFn): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
    return
  }
  init()
}

/**
 * Run on each Astro view transition page load.
 */
export function onAstroPageLoad(init: InitFn): void {
  document.addEventListener('astro:page-load', init)
}

/**
 * A small guard to avoid double-binding global listeners.
 * Prefer for "document.addEventListener(...)" that should be registered once per session.
 */
export function runOnce(key: string, init: InitFn): void {
  const root = document.documentElement
  const normalizedKey = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
  const marker = `data-client-init-${normalizedKey}`
  if (root.getAttribute(marker) === 'true') return
  root.setAttribute(marker, 'true')
  init()
}

