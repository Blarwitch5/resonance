import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Pages publiques : accessibles sans authentification
const publicPaths = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/explorer',
]

// Pages gardées : redirigent vers /login si non authentifié
// On teste quand même l'accessibilité de la page de destination (login)
const guardedPaths = [
  '/library',
  '/profile',
  '/collections',
]

// Règles désactivées :
// - color-contrast : re-enable une fois les tokens de thème validés manuellement
const DISABLED_RULES = ['color-contrast']

// Tags WCAG 2.1 niveau AA
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

test.describe('a11y: pages publiques (WCAG 2.1 AA)', () => {
  for (const path of publicPaths) {
    test(`${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' })

      const results = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .disableRules(DISABLED_RULES)
        .analyze()

      expect(results.violations).toEqual([])
    })
  }
})

test.describe('a11y: pages gardées — page login (WCAG 2.1 AA)', () => {
  for (const path of guardedPaths) {
    test(`redirect depuis ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' })

      // Accepte soit la page elle-même soit la redirection vers /login
      const currentPath = new URL(page.url()).pathname
      const isOnLoginPage = currentPath === '/login'

      if (!isOnLoginPage) {
        // Authentifié (ex: session active en CI) — teste la vraie page
        const results = await new AxeBuilder({ page })
          .withTags(WCAG_TAGS)
          .disableRules(DISABLED_RULES)
          .analyze()

        expect(results.violations).toEqual([])
      } else {
        // Redirigé vers /login — on teste la page login
        const results = await new AxeBuilder({ page })
          .withTags(WCAG_TAGS)
          .disableRules(DISABLED_RULES)
          .analyze()

        expect(results.violations).toEqual([])
      }
    })
  }
})

test.describe('a11y: composants interactifs', () => {
  test('explorer: résultats de recherche annoncés aria-live', async ({ page }) => {
    await page.goto('/explorer', { waitUntil: 'networkidle' })

    const searchResultsContainer = page.locator('#search-results-container')
    const ariaLive = await searchResultsContainer.getAttribute('aria-live')
    expect(ariaLive).toBe('polite')
  })

  test('login: formulaire accessible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })

    const results = await new AxeBuilder({ page })
      .include('form')
      .withTags(WCAG_TAGS)
      .disableRules(DISABLED_RULES)
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('signup: formulaire accessible', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'networkidle' })

    const results = await new AxeBuilder({ page })
      .include('form')
      .withTags(WCAG_TAGS)
      .disableRules(DISABLED_RULES)
      .analyze()

    expect(results.violations).toEqual([])
  })
})
