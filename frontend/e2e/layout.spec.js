// The signed-in layout: grouped text-only sidebar, phone drawer, no version banner, user menu.
// One sign-in for the whole file (the API allows 10 sign-ins per 15 minutes from one address).
import { expect, test } from '@playwright/test'
import { ADMIN, signIn } from './helpers'

test.describe.configure({ mode: 'serial' })

let page

test.beforeAll(async ({ browser }) => {
  page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  // The app in this test run is built as version "e2eapp0" (playwright.config.js); the API answers
  // with another version, as when Render was not redeployed yet. No banner may appear.
  await page.route('**/api/health', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', database: 'connected', email: 'configured', version: 'abc1234' }) })
  )
  await signIn(page, ADMIN.email, ADMIN.password)
  await expect(page.getByRole('heading', { name: 'Administrator dashboard' })).toBeVisible()
})

test('desktop: grouped sidebar with text links, table page with search and filter panel', async () => {
  const sidebar = page.getByRole('navigation', { name: 'Menu', exact: true })
  // Group labels (shown in UPPERCASE by CSS)
  await expect(sidebar.locator('p')).toHaveText(['Review', 'Manage', 'Settings'])
  // Text only: no icons in the sidebar links
  await expect(sidebar.locator('svg')).toHaveCount(0)
  // The open page is marked for screen readers too, not only by colour
  await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')

  await sidebar.getByRole('link', { name: 'Listings' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Listing moderation' })).toBeVisible()
  await expect(page.getByRole('searchbox')).toBeVisible()
  await expect(page.getByLabel('By status')).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Filter' })).toBeVisible()
})

test('no version banner, even when the app and the API versions differ', async () => {
  for (const url of ['/admin', '/admin/verification', '/admin/rules']) {
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/different versions|redeploy the API/i)).toHaveCount(0)
    await expect(page.getByText('abc1234')).toHaveCount(0)
  }
})

test('phone: bottom bar, menu drawer with the same groups, no horizontal scrolling', async () => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Menu' })
  await expect(drawer.locator('nav p')).toHaveText(['Review', 'Manage', 'Settings'])
  await drawer.getByRole('link', { name: 'Audit log' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Audit log' })).toBeVisible()
  await expect(drawer).toHaveCount(0)

  // Touch targets: every link and button in the bottom bar is at least 48 px high
  for (const item of await page.getByRole('navigation', { name: 'Main pages' }).locator('a, button').all()) {
    expect((await item.boundingBox()).height).toBeGreaterThanOrEqual(48)
  }
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(390)
})

test('search (Ctrl+K) finds a page and opens it', async () => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Administrator dashboard' })).toBeVisible()
  await page.keyboard.press('Control+k')
  const search = page.getByRole('dialog', { name: 'Search' })
  await search.getByRole('combobox').fill('audit')
  await search.getByRole('option', { name: 'Audit log' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Audit log' })).toBeVisible()
})

test('user menu (shadcn dropdown): profile and settings, sign out', async () => {
  await page.getByRole('button', { name: /account menu/ }).click()
  await expect(page.getByRole('menuitem', { name: 'Profile and settings' })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
