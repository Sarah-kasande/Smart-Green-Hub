// "Available plants" (docs/DEVIATIONS.md W42-W44), in a real browser:
// a nursery has a ready batch -> an approved institution sees it under "Available plants" and
// requests some -> the nursery approves -> both confirm -> stock goes down; the hide switch works.
// Runs ONLY against the local e2e database started by playwright.config.js (fake accounts).
import { expect, test } from '@playwright/test'
import { ADMIN, PASSWORD, approvedAccount, signIn, uniqueEmail } from './helpers'

test.describe.configure({ mode: 'serial' })

const NURSERY = 'E2E Available Nursery'
let operator
let institution
let batchUrl

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

test.beforeAll(async ({ browser }) => {
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await signIn(await adminContext.newPage(), ADMIN.email, ADMIN.password)
  const op = await approvedAccount(browser, adminContext, {
    role: 'operator',
    full_name: 'E2E Available Operator',
    email: uniqueEmail('e2e-avail-op'),
    password: PASSWORD,
    nursery: { name: NURSERY, district: 'Kicukiro', sector: 'Kanombe' },
  })
  const inst = await approvedAccount(browser, adminContext, {
    role: 'institution',
    full_name: 'E2E Available School',
    email: uniqueEmail('e2e-avail-school'),
    password: PASSWORD,
    institution: { org_name: 'E2E Available School', org_type: 'school', district: 'Gasabo', sector: 'Remera' },
  })
  operator = await op.newPage()
  institution = await inst.newPage()
})

test('1. the nursery adds a batch planted long ago: it is ready and shown to institutions', async () => {
  await operator.goto('/operator/batches/new')
  await operator.getByLabel('Species').selectOption({ index: 1 })
  await operator.getByLabel('Number of plants').fill('40')
  await operator.getByLabel('Planting date').fill(daysAgo(200))
  // The form says what institutions can see, and the switch is on by default
  await expect(operator.getByText('Institutions see only the species', { exact: false })).toBeVisible()
  await expect(operator.getByLabel('Show to institutions when ready', { exact: false })).toBeChecked()
  await operator.getByRole('button', { name: 'Save batch' }).click()
  await expect(operator.getByText('Batch saved.')).toBeVisible()
  await operator.getByRole('link', { name: /#\d+/ }).first().click()
  batchUrl = operator.url()
})

test('2. the institution sees it under "Available plants" and requests some', async () => {
  await institution.goto('/institution/board')
  await institution.getByRole('button', { name: 'Available plants' }).click()
  const card = institution.locator('li', { hasText: NURSERY }).first()
  await expect(card).toBeVisible()
  await expect(card.getByText('40 available')).toBeVisible()
  await card.getByRole('button', { name: 'Request plants' }).click()
  await institution.getByLabel('How many plants?').fill('15')
  await institution.getByLabel('Planting purpose').fill('Trees along the school fence')
  await institution.getByLabel('Message to the nursery', { exact: false }).fill('We can collect on Saturday')
  await institution.getByRole('button', { name: 'Send request' }).click()
  await expect(institution.getByText('Request sent.', { exact: false })).toBeVisible()
})

test('3. the nursery sees it in Requests as "Available plant" and approves', async () => {
  await operator.goto('/operator/requests')
  await expect(operator.getByText('Available plant', { exact: true }).first()).toBeVisible()
  await expect(operator.getByText('We can collect on Saturday')).toBeVisible()
  await operator.getByRole('button', { name: 'Approve' }).click()
  await expect(operator.getByText('Request approved.', { exact: false })).toBeVisible()
})

test('4. both confirm the hand-over and the stock goes down', async () => {
  // The status filter (first drop-down on the page) shows approved requests
  await operator.goto('/operator/requests')
  await operator.getByRole('combobox').first().selectOption('approved')
  await operator.getByRole('button', { name: 'Confirm hand-over' }).click()
  await expect(operator.getByText('Waiting for the other side', { exact: false }).first()).toBeVisible()

  await institution.goto('/institution/requests')
  await institution.getByRole('combobox').first().selectOption('approved')
  await institution.getByLabel('Planting site').fill('School fence, Remera')
  await institution.getByRole('button', { name: 'Confirm receipt' }).click()
  await expect(institution.getByText('Hand-over complete.', { exact: false })).toBeVisible()

  await operator.goto(batchUrl)
  await expect(operator.getByText('25 / 40')).toBeVisible()
})

test('5. "Show to institutions" off hides the batch', async () => {
  await operator.goto(batchUrl)
  await operator.getByLabel('Show to institutions when ready', { exact: false }).uncheck()
  await operator.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(operator.getByText('Changes saved.')).toBeVisible()

  await institution.goto('/institution/board')
  await institution.getByRole('button', { name: 'Available plants' }).click()
  await expect(institution.locator('li', { hasText: NURSERY })).toHaveCount(0)
})
