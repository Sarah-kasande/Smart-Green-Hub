// Every administrator page loads without an error, and a failed request never leaves a page on
// "Loading..." forever: it shows a clear message with "Try again".
import { expect, test } from '@playwright/test'
import { ADMIN, signIn } from './helpers'

test.use({ viewport: { width: 1440, height: 900 } })

const PAGES = [
  ['/admin', 'Administrator dashboard'],
  ['/admin/verification', 'Verification Queue'],
  ['/admin/rules', 'Rules & Species'],
  ['/admin/listings', 'Listing moderation'],
  ['/admin/impact', 'Impact'],
  ['/admin/audit', 'Audit log'],
  ['/admin/notifications-failed', 'Email problems'],
  ['/admin/notifications', 'Notifications'],
  ['/admin/settings', 'Settings'],
]

test('every administrator page opens without an error', async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password)
  await expect(page.getByRole('heading', { name: 'Administrator dashboard' })).toBeVisible()
  for (const [url, heading] of PAGES) {
    await page.goto(url)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(page.getByText('Loading…')).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
  // Rules & Species shows its data, not a spinner
  await page.goto('/admin/rules')
  await expect(page.getByLabel('Sales lookback (days)')).toHaveValue('28')
  await expect(page.getByText('[DEMO - confirm in needs assessment]').first()).toBeVisible()
})

test('a failed request shows a clear message and "Try again" recovers', async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password)
  await expect(page.getByRole('heading', { name: 'Administrator dashboard' })).toBeVisible()

  // Simulate an API that does not know the new routes (as the old Render backend answered)
  const oldServer = (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'NOT_FOUND', message: 'This API route does not exist' }) })
  await page.route('**/api/admin/rules', oldServer)
  await page.route('**/api/admin/species**', oldServer)

  await page.goto('/admin/rules')
  await expect(page.getByText('The server does not know this request').first()).toBeVisible()
  await expect(page.getByText('Loading…')).toHaveCount(0)

  // The server is fixed: "Try again" loads the data
  await page.unroute('**/api/admin/rules')
  await page.unroute('**/api/admin/species**')
  await page.getByRole('button', { name: 'Try again' }).first().click()
  await page.getByRole('button', { name: 'Try again' }).first().click()
  await expect(page.getByLabel('Sales lookback (days)')).toHaveValue('28')
  await expect(page.getByText('The server does not know this request')).toHaveCount(0)
})

test('a request that never answers ends with a message, not an endless spinner', async ({ page }) => {
  await signIn(page, ADMIN.email, ADMIN.password)
  await expect(page.getByRole('heading', { name: 'Administrator dashboard' })).toBeVisible()
  // The connection drops while loading
  await page.route('**/api/admin/listings**', (route) => route.abort('connectionfailed'))
  await page.goto('/admin/listings')
  await expect(page.getByText('Cannot reach the server')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})
