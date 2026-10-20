// The main journey of the system, in a real browser at 390 px:
// register -> confirm email -> admin approves -> batch -> sale -> OFFLINE sale that syncs later ->
// surplus listing -> institution requests -> approve -> two-sided hand-over -> impact (public).
import { expect, test } from '@playwright/test'
import { ADMIN, PASSWORD, approvedAccount, codeFromEmail, signIn, uniqueEmail, visibleText } from './helpers'

test.describe.configure({ mode: 'serial' })

const operatorEmail = uniqueEmail('e2e-operator')
const institutionEmail = uniqueEmail('e2e-school')
let operator // page of the nursery operator
let adminContext
let institution // page of the institution

test.beforeAll(async ({ browser }) => {
  adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  operator = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
})

test('1. a nursery registers and confirms its email', async () => {
  await operator.goto('/register?role=operator')
  await operator.getByLabel('Your full name').fill('E2E Operator')
  await operator.getByLabel('Email address').fill(operatorEmail)
  await operator.getByLabel('Password').fill(PASSWORD)
  await operator.getByLabel('Nursery name').fill('E2E Kabeza Nursery')
  await operator.getByLabel('District').selectOption('Kicukiro')
  await operator.getByLabel('Sector').fill('Kanombe')
  await operator.getByRole('checkbox').check()
  await operator.getByRole('button', { name: 'Create account' }).click()
  // The 6-digit code screen
  await expect(operator.getByRole('heading', { name: 'Enter your code' })).toBeVisible()
  await expect(operator.getByLabel('6-digit code')).toHaveAttribute('inputmode', 'numeric')
  await operator.getByLabel('6-digit code').fill(await codeFromEmail(operatorEmail))
  await operator.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(operator.getByRole('heading', { name: 'Email confirmed' })).toBeVisible()

  await signIn(operator, operatorEmail, PASSWORD)
  await expect(visibleText(operator, 'Waiting for approval')).toBeVisible()
})

test('2. the administrator approves it in the verification queue', async () => {
  const admin = await adminContext.newPage()
  await signIn(admin, ADMIN.email, ADMIN.password)
  await expect(admin.getByRole('heading', { name: 'Administrator dashboard' })).toBeVisible()
  await admin.getByRole('link', { name: 'Verification Queue' }).first().click()
  await admin.getByRole('button', { name: /E2E Kabeza Nursery/ }).click()
  await admin.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(admin.getByText('Decision saved')).toBeVisible()
})

test('3. the operator adds a batch and records a sale', async () => {
  await operator.reload()
  await expect(visibleText(operator, 'Plants in stock')).toBeVisible()

  await operator.goto('/operator/batches/new')
  await operator.getByLabel('Species').selectOption({ index: 1 })
  await operator.getByLabel('Number of plants').fill('120')
  await operator.getByLabel('Price per plant (RWF)').fill('500')
  await operator.getByRole('button', { name: 'Save batch' }).click()
  await expect(operator.getByText('Batch saved.')).toBeVisible()

  await operator.goto('/operator/sales?tab=sale')
  await operator.getByLabel('Batch').selectOption({ index: 1 })
  await operator.getByLabel('Number of plants sold').fill('20')
  await expect(operator.getByText('Total: RWF 10,000')).toBeVisible()
  await operator.getByRole('button', { name: 'Save sale' }).click()
  await expect(operator.getByText('Sale saved.')).toBeVisible()
})

test('4. a sale recorded OFFLINE waits on the phone and syncs when back online', async () => {
  await operator.goto('/operator/sales?tab=sale')
  await operator.getByLabel('Batch').selectOption({ index: 1 })
  await operator.context().setOffline(true)
  await expect(visibleText(operator, 'Offline')).toBeVisible()

  await operator.getByLabel('Number of plants sold').fill('5')
  await operator.getByRole('button', { name: 'Save sale' }).click()
  await expect(operator.getByText('Saved on this phone')).toBeVisible()
  await expect(visibleText(operator, '1 waiting to sync')).toBeVisible()

  await operator.context().setOffline(false)
  // The "online" event starts the sync automatically
  await expect(visibleText(operator, 'Online')).toBeVisible({ timeout: 20_000 })

  await operator.goto('/operator/batches')
  // 120 - 20 - 5 = 95 in stock: the offline sale arrived exactly once
  await expect(operator.getByText('95', { exact: true }).first()).toBeVisible()
})

test('5. the operator posts surplus plants on the board', async () => {
  await operator.goto('/operator/surplus?new=1')
  await operator.getByLabel('Batch').selectOption({ index: 1 })
  await operator.getByLabel('Number of plants offered').fill('30')
  await operator.getByRole('button', { name: 'Publish' }).click()
  await expect(operator.getByText('Listing published')).toBeVisible()
})

test('6. an approved school requests plants from the board', async ({ browser }) => {
  const context = await approvedAccount(browser, adminContext, {
    role: 'institution',
    full_name: 'E2E School Contact',
    email: institutionEmail,
    password: PASSWORD,
    institution: { org_name: 'E2E Remera School', org_type: 'school', district: 'Gasabo', sector: 'Remera' },
  })
  institution = await context.newPage()
  await institution.setViewportSize({ width: 390, height: 844 })
  await institution.goto('/institution/board')
  await expect(institution.getByText('30 available')).toBeVisible()
  await institution.getByRole('button', { name: 'Request plants' }).first().click()
  await institution.getByLabel('How many plants?').fill('10')
  await institution.getByLabel('Planting purpose').fill('Trees along the school fence')
  await institution.getByRole('button', { name: 'Send request' }).click()
  await expect(institution.getByText('Request sent')).toBeVisible()
})

test('7. approval and a two-sided hand-over; impact appears for everyone', async () => {
  await operator.goto('/operator/requests')
  await expect(operator.getByText('E2E Remera School').first()).toBeVisible()
  await operator.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(operator.getByText('Request approved')).toBeVisible()

  await operator.getByRole('button', { name: 'Approved', exact: true }).click()
  await operator.getByLabel(/Land cleared/).fill('6')
  await operator.getByRole('button', { name: 'Confirm hand-over' }).click()
  await expect(operator.getByText('Waiting for the other side').first()).toBeVisible()

  await institution.goto('/institution/requests')
  await institution.getByRole('button', { name: 'Approved', exact: true }).click()
  await institution.getByLabel('Planting site').fill('Remera school garden')
  await institution.getByRole('button', { name: 'Confirm receipt' }).click()
  await expect(institution.getByText('Hand-over complete')).toBeVisible()

  await institution.goto('/institution/impact')
  await expect(visibleText(institution, 'Plants redirected')).toBeVisible()
  await expect(institution.getByText('Remera school garden').first()).toBeVisible()

  // Public visitors see the aggregate figure only
  await operator.context().clearCookies()
  await operator.goto('/')
  await expect(operator.getByText('No hand-overs have been recorded yet')).toHaveCount(0)
})

test('8. dark mode can be switched on in Settings and stays after reload', async () => {
  await institution.goto('/institution/settings')
  await institution.getByText('Dark', { exact: true }).click()
  await expect(institution.locator('html')).toHaveAttribute('data-theme', 'dark')
  await institution.reload()
  await expect(institution.locator('html')).toHaveAttribute('data-theme', 'dark')
  await institution.getByText('Light', { exact: true }).click()
  await expect(institution.locator('html')).toHaveAttribute('data-theme', 'light')
})
