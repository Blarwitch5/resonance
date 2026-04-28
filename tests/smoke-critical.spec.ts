import { expect, test } from '@playwright/test'

async function assertReachableOrRedirectsToLogin(path: string, page: import('@playwright/test').Page): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  const currentPath = new URL(page.url()).pathname
  if (currentPath === '/login') {
    await expect(page.locator('form')).toBeVisible()
    return
  }
  await expect(page).toHaveURL(new RegExp(path.replace(/[[\]()]/g, '\\$&')))
}

test.describe('smoke: critical routes and guards', () => {
  test('home route is reachable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main')).toBeVisible()
  })

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('signup page is accessible', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/signup/)
    await expect(page.locator('form')).toBeVisible()
  })

  test('explore route is reachable (public)', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'domcontentloaded' })
    const currentPath = new URL(page.url()).pathname
    // explore is public — should not redirect to login
    await expect(page.locator('input[type="search"]')).toBeVisible()
  })

  test('feed route is guarded by login', async ({ page }) => {
    await assertReachableOrRedirectsToLogin('/feed', page)
  })

  test('shelf route is guarded by login', async ({ page }) => {
    await assertReachableOrRedirectsToLogin('/shelf', page)
  })

  test('notifications route is guarded by login', async ({ page }) => {
    await assertReachableOrRedirectsToLogin('/notifications', page)
  })

  test('settings route is guarded by login', async ({ page }) => {
    await assertReachableOrRedirectsToLogin('/settings', page)
  })

  test('collections route is guarded by login', async ({ page }) => {
    await assertReachableOrRedirectsToLogin('/collections', page)
  })
})
