// Public pages: landing, language switch, no horizontal scrolling at 390 px.
import { expect, test } from '@playwright/test'

test('landing page in English and Kinyarwanda, with impact figures from real records', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Fewer wasted plants.')
  // The figures come from /api/public/impact (0 until a hand-over is confirmed, never invented)
  await expect(page.getByRole('heading', { name: 'Greening impact so far' })).toBeVisible()
  await expect(page.getByText('Plants redirected')).toBeVisible()
  await expect(page.getByText('…')).toHaveCount(0) // the numbers have loaded
  // The hero photo (free licence) has a text description, and the photo credits are in the footer
  await expect(page.getByRole('img', { name: /tea plantation/i })).toBeVisible()
  await expect(page.getByText('Photo credits')).toBeVisible()

  await page.getByRole('button', { name: 'Kinyarwanda' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Ibimera bike bipfa ubusa.')
  await expect(page.locator('html')).toHaveAttribute('lang', 'rw')
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Fewer wasted plants.')

  // Mobile-first: nothing wider than the 390 px screen
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(390)
})

test('protected pages send visitors to sign in', async ({ page }) => {
  await page.goto('/operator/batches')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('a wrong password shows a clear message', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email address').fill('nobody@example.test')
  await page.getByLabel('Password').fill('WrongPass123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Email or password is incorrect')
})
