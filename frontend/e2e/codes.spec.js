// One-time codes in the browser: wrong code, paste, resend countdown, password reset, dark mode.
import { expect, test } from '@playwright/test'
import { PASSWORD, api, codeEmailCount, codeFromEmail, signIn, uniqueEmail } from './helpers'

async function registerThroughForm(page, email) {
  await page.goto('/register?role=institution')
  await page.getByLabel('Your full name').fill('Code Tester')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByLabel('Institution name').fill('Code Test School')
  await page.getByLabel('Type of institution').selectOption('school')
  await page.getByLabel('District').selectOption('Gasabo')
  await page.getByLabel('Sector').fill('Remera')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible()
}

test('registration code: countdown, wrong code, pasted code, then confirmed', async ({ page }) => {
  const email = uniqueEmail('e2e-code')
  await registerThroughForm(page, email)
  const code = await codeFromEmail(email)

  // "Send the code again" waits 60 seconds
  await expect(page.getByRole('button', { name: /Send the code again in \d+ s/ })).toBeDisabled()

  // A wrong code: clear message with the tries left
  const field = page.getByLabel('6-digit code')
  await field.fill(code === '000000' ? '111111' : '000000')
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByText('The code is not correct. 4 tries left.')).toBeVisible()

  // Pasting "123 456"-style text keeps only the digits
  await field.fill(`${code.slice(0, 3)} ${code.slice(3)}`)
  await expect(field).toHaveValue(code)
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible()
})

test('sign-in before confirming leads to the code screen with a fresh code', async ({ page }) => {
  const email = uniqueEmail('e2e-late')
  await registerThroughForm(page, email)
  const before = codeEmailCount(email)
  await signIn(page, email, PASSWORD)
  await expect(page.getByRole('alert')).toContainText('6-digit code')
  // The account just got a code, so the 60-second limit applies: the screen still opens
  await page.getByRole('button', { name: 'Enter my confirmation code' }).click()
  await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible()
  await page.getByLabel('6-digit code').fill(await codeFromEmail(email, before - 1))
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible()
})

test('password reset with a code; the new password works', async ({ browser, page }) => {
  // Prepare a confirmed account quickly through the API
  const email = uniqueEmail('e2e-reset')
  const context = await browser.newContext()
  await api(context, 'POST', '/auth/register', {
    role: 'institution',
    full_name: 'Reset Tester',
    email,
    password: PASSWORD,
    institution: { org_name: 'Reset School', org_type: 'school', district: 'Gasabo', sector: 'Remera' },
  })
  await api(context, 'POST', '/auth/verify-email', { email, code: await codeFromEmail(email) })
  const codesBefore = codeEmailCount(email)

  await page.goto('/forgot-password')
  await page.getByLabel('Email address').fill(email)
  await page.getByRole('button', { name: 'Send the code' }).click()
  await expect(page.getByText(`If ${email} is registered`)).toBeVisible()

  await page.getByLabel('6-digit code').fill(await codeFromEmail(email, codesBefore))
  await page.getByLabel('New password', { exact: true }).fill('BrandNew789')
  await page.getByLabel('Repeat the new password').fill('BrandNew789')
  await page.getByRole('button', { name: 'Save new password' }).click()
  await expect(page.getByText('Your password was changed')).toBeVisible()

  await signIn(page, email, 'BrandNew789')
  await expect(page).toHaveURL(/\/institution/)
})

test('the code screen works in dark mode', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('sgh_theme', 'dark'))
  await page.goto('/verify-email?email=someone%40example.test')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('heading', { name: 'Enter your code' })).toBeVisible()
  await expect(page.getByLabel('6-digit code')).toBeVisible()
})
