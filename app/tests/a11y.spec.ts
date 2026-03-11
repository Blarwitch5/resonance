import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const publicPaths = ['/', '/login', '/forgot-password', '/explorer']

for (const path of publicPaths) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' })

    const accessibilityScanResults = await new AxeBuilder({ page })
      // Avoid false positives on animations/transitions; keep core rules.
      .disableRules(['color-contrast'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })
}

