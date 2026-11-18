// Administrator records and the public homepage (docs/DEVIATIONS.md W47, W48), in a real browser:
// the nursery agrees in Settings -> the administrator publishes its ready batch -> visitors see the card
// on the homepage (with "Sign in to request", no shop words) -> archiving the batch removes it ->
// an archived nursery cannot sign in.
// Runs ONLY against the local e2e database started by playwright.config.js (fake accounts).
import { expect, test } from '@playwright/test'
import { ADMIN, PASSWORD, api, approvedAccount, signIn, uniqueEmail } from './helpers'

test.describe.configure({ mode: 'serial' })

const NURSERY = 'E2E Homepage Nursery'
const operatorEmail = uniqueEmail('e2e-home-op')
let adminContext
let admin
let operator
let batchId

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

test.beforeAll(async ({ browser }) => {
  adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  admin = await adminContext.newPage()
  await signIn(admin, ADMIN.email, ADMIN.password)
  await expect(admin.getByRole('heading', { name: 'Administrator dashboard' })).toBeVisible()
  const op = await approvedAccount(browser, adminContext, {
    role: 'operator',
    full_name: 'E2E Homepage Operator',
    email: operatorEmail,
    password: PASSWORD,
    nursery: { name: NURSERY, district: 'Gasabo', sector: 'Remera' },
  })
  operator = await op.newPage()
  // A ready batch (planted 200 days ago), prepared through the API to keep the test short
  const species = await api(op, 'GET', '/species')
  const created = await api(op, 'POST', '/operator/batches', { species_id: species.body.species[0].id, quantity: 60, planting_date: daysAgo(200), unit_price: 350, stage: 'ready' })
  batchId = created.body.batch.id
})

test('1. without consent the administrator cannot publish, and is told why', async () => {
  await admin.goto('/admin/batches')
  await admin.getByLabel(`Select batch #${batchId}`).check()
  await admin.getByRole('button', { name: 'Publish selected' }).click()
  await expect(admin.getByText('the nursery has not allowed the homepage', { exact: false })).toBeVisible()
})

test('2. the nursery agrees in Settings (off by default)', async () => {
  await operator.goto('/operator/settings')
  await operator.getByRole('tab', { name: 'Nursery details' }).click()
  const consent = operator.getByLabel('Allow my plants to appear on the public homepage', { exact: false })
  await expect(consent).not.toBeChecked()
  await consent.check()
  await expect(operator.getByText('Your plants may now appear on the public homepage.')).toBeVisible()
})

test('3. the administrator publishes it and visitors see the card', async ({ browser }) => {
  await admin.goto('/admin/batches')
  await admin.getByLabel(`Select batch #${batchId}`).check()
  await admin.getByRole('button', { name: 'Publish selected' }).click()
  await expect(admin.getByText('1 published.')).toBeVisible()

  const visitor = await (await browser.newContext()).newPage()
  await visitor.goto('/')
  const section = visitor.locator('#plants')
  await expect(section.getByRole('heading', { name: 'Plants available now' })).toBeVisible()
  const card = section.locator('li', { hasText: NURSERY })
  await expect(card).toBeVisible()
  await expect(card.getByText('60')).toBeVisible()
  await expect(card.getByText('Ready')).toBeVisible()
  await expect(card.getByRole('progressbar')).toBeVisible()
  await expect(card.getByRole('link', { name: 'Sign in to request' })).toBeVisible()
  await expect(section.getByText(/\b(buy|cart|checkout)\b/i)).toHaveCount(0)
})

test('4. archiving the batch (with a reason) removes it from the homepage', async ({ browser }) => {
  await admin.goto('/admin/batches')
  await admin.getByRole('button', { name: `Open: #${batchId}` }).click()
  await admin.getByRole('button', { name: 'Archive', exact: true }).click()
  await admin.getByLabel('Reason', { exact: false }).fill('E2E test archive')
  await admin.getByRole('dialog').getByRole('button', { name: 'Archive' }).click()
  await expect(admin.getByText('Archived.', { exact: false })).toBeVisible()

  const visitor = await (await browser.newContext()).newPage()
  await visitor.goto('/')
  await expect(visitor.locator('#plants').locator('li', { hasText: NURSERY })).toHaveCount(0)
})

test('5. an archived nursery cannot sign in', async ({ browser }) => {
  const nurseries = await api(adminContext, 'GET', '/admin/nurseries?status=all')
  const nursery = nurseries.body.items.find((n) => n.name === NURSERY)
  expect((await api(adminContext, 'POST', `/admin/nurseries/${nursery.id}/archive`, { reason: 'E2E test' })).status).toBe(200)
  const page = await (await browser.newContext()).newPage()
  await signIn(page, operatorEmail, PASSWORD)
  await expect(page.getByText('This account was archived by the administrator', { exact: false })).toBeVisible()
})
