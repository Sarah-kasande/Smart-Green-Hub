// Species requests (docs/DEVIATIONS.md W39), in a real browser:
// a nursery proposes a species with a batch -> the administrator approves it with its rules ->
// it appears in the dropdown; a second proposal is rejected -> the nursery chooses another species.
// Runs ONLY against the local e2e database started by playwright.config.js (fake accounts).
import { expect, test } from '@playwright/test'
import { ADMIN, PASSWORD, approvedAccount, signIn, uniqueEmail, visibleText } from './helpers'

test.describe.configure({ mode: 'serial' })

let adminContext
let admin // administrator page (desktop)
let operator // nursery page (390 px)

test.beforeAll(async ({ browser }) => {
  adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  admin = await adminContext.newPage()
  await signIn(admin, ADMIN.email, ADMIN.password)
  await expect(admin.getByRole('heading', { name: 'Administrator dashboard' })).toBeVisible()
  const email = uniqueEmail('e2e-species-op')
  const context = await approvedAccount(browser, adminContext, {
    role: 'operator',
    full_name: 'E2E Species Operator',
    email,
    password: PASSWORD,
    nursery: { name: 'E2E Species Nursery', district: 'Gasabo', sector: 'Remera' },
  })
  operator = await context.newPage()
})

async function proposeBatch(name) {
  await operator.goto('/operator/batches/new')
  await operator.getByLabel('Species').selectOption({ label: 'My species is not listed' })
  // No growing time or prime window on the form: only the administrator sets them
  await expect(operator.getByText('Adjust the species defaults')).toHaveCount(0)
  await expect(operator.getByLabel('Days until ready')).toHaveCount(0)
  await operator.getByLabel('Species name').fill(name)
  await operator.getByLabel('Category').selectOption({ label: 'Trees' })
  await operator.getByLabel('Number of plants').fill('30')
  await operator.getByRole('button', { name: 'Save batch' }).click()
  await expect(operator.getByText('Batch saved. It waits for species approval.')).toBeVisible()
}

test('1. a nursery adds a batch with a species that is not listed', async () => {
  await proposeBatch('E2E Umusave tree')
  await expect(visibleText(operator, 'Waiting for species approval')).toBeVisible()
})

test('2. a similar name asks "Did you mean ...?"', async () => {
  await operator.goto('/operator/batches/new')
  await operator.getByLabel('Species').selectOption({ label: 'My species is not listed' })
  await operator.getByLabel('Species name').fill('E2E Umusave tre')
  await operator.getByLabel('Category').selectOption({ label: 'Trees' })
  await operator.getByLabel('Number of plants').fill('5')
  await operator.getByRole('button', { name: 'Save batch' }).click()
  await expect(operator.getByText('Did you mean one of these?')).toBeVisible()
  await expect(operator.getByRole('button', { name: 'Use this species: E2E Umusave tree' })).toBeVisible()
})

test('3. the administrator approves it with its rules', async () => {
  await admin.goto('/admin')
  await admin.getByRole('link', { name: /Species requests/ }).first().click()
  await admin.getByRole('button', { name: 'Open: E2E Umusave tree' }).click()
  await admin.getByRole('button', { name: 'Approve', exact: true }).click()
  await admin.getByRole('button', { name: 'Approve species' }).click()
  // The rules are required: nothing is sent without them
  await expect(admin.getByText('This value is not valid.').first()).toBeVisible()
  await admin.getByLabel('Days to ready').fill('120')
  await admin.getByLabel('Prime window (days)').fill('60')
  await admin.getByRole('button', { name: 'Approve species' }).click()
  await expect(admin.getByText('Species approved. The nursery was notified.')).toBeVisible()
})

test('4. the approved species is in the dropdown and the batch has dates', async () => {
  await operator.goto('/operator/batches/new')
  await expect(operator.getByLabel('Species').locator('option', { hasText: 'E2E Umusave tree' })).toHaveCount(1)
  await operator.goto('/operator/batches')
  await expect(visibleText(operator, 'Waiting for species approval')).toHaveCount(0)
  await operator.goto('/operator/notifications')
  await expect(operator.getByText('The species "E2E Umusave tree" was approved.', { exact: false })).toBeVisible()
})

test('5. a rejected species: the nursery is told why and chooses another species', async () => {
  await proposeBatch('E2E Not a real plant')
  await admin.goto('/admin/species-requests')
  await admin.getByRole('button', { name: 'Open: E2E Not a real plant' }).click()
  await admin.getByRole('button', { name: 'Reject', exact: true }).click()
  await admin.getByLabel('Reason (sent to the nursery)').fill('Please use an existing species')
  await admin.getByRole('button', { name: 'Reject species' }).click()
  await expect(admin.getByText('Species rejected. The nursery was notified.')).toBeVisible()

  await operator.goto('/operator/batches')
  await operator.getByRole('link', { name: /E2E Not a real plant/ }).first().click()
  await expect(visibleText(operator, 'Species rejected: choose another species')).toBeVisible()
  await expect(operator.getByText('Please use an existing species')).toBeVisible()
  await operator.getByLabel('Another species').selectOption({ label: 'E2E Umusave tree' })
  await operator.getByRole('button', { name: 'Use this species' }).click()
  await expect(operator.getByText('Species changed.')).toBeVisible()
  await expect(operator.getByText('In stock').first()).toBeVisible()
})
