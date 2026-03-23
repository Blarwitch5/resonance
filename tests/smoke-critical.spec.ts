import { expect, test } from '@playwright/test'

async function assertReachableOrRedirectsToLogin(path: string, page: import('@playwright/test').Page): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  const currentPath = new URL(page.url()).pathname
  if (currentPath === '/login') {
    await expect(page.locator('form')).toBeVisible()
    return
  }
  await expect(page).toHaveURL(new RegExp(path))
}

test.describe('smoke: critical routes and guards', () => {
  test('explorer route is reachable or guarded by login', async ({ page }) => {
    await assertReachableOrRedirectsToLogin('/explorer', page)
  })

  test('library route is reachable or guarded by login', async ({ page }) => {
    await assertReachableOrRedirectsToLogin('/library', page)
  })

  test('profile route is reachable or guarded by login', async ({ page }) => {
    await assertReachableOrRedirectsToLogin('/profile', page)
  })

  test('home route is reachable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main')).toBeVisible()
  })

  test('explorer search UI is available when route is accessible', async ({ page }) => {
    await page.goto('/explorer', { waitUntil: 'domcontentloaded' })
    const currentPath = new URL(page.url()).pathname
    if (currentPath === '/login') {
      await expect(page.locator('form')).toBeVisible()
      return
    }
    await expect(page.locator('input[type="search"], input[name="search"]')).toBeVisible()
  })

  test('login page remains accessible directly', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})

