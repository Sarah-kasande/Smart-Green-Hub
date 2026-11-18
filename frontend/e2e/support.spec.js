// Help requests (docs/DEVIATIONS.md W51), in a real browser:
// a nursery contacts the administrator (online, then offline: saved and sent when back online) ->
// the administrator answers and resolves it in Support -> the nursery sees the answer and
// "Was this solved?" -> a visitor uses the public contact form on the landing page.
// Runs ONLY against the local e2e database started by playwright.config.js (fake accounts).
import { expect, test } from '@playwright/test'
import { ADMIN, PASSWORD, approvedAccount, signIn, uniqueEmail } from './helpers'

test.describe.configure({ mode: 'serial' })

let operatorContext
let operator
let admin

test.beforeAll(async ({ browser }) => {
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  admin = await adminContext.newPage()
  await signIn(admin, ADMIN.email, ADMIN.password)
  await expect(admin.getByRole('heading', { name: 'Administrator dashboard' })).toBeVisible()
  operatorContext = await approvedAccount(browser, adminContext, {
    role: 'operator',
    full_name: 'E2E Help Operator',
    email: uniqueEmail('e2e-help-op'),
    password: PASSWORD,
    nursery: { name: 'E2E Help Nursery', district: 'Gasabo', sector: 'Remera' },
  })
  operator = await operatorContext.newPage()
})

async function sendRequest(subject) {
  await operator.getByRole('button', { name: 'Contact the administrator' }).first().click()
  await operator.getByLabel('Category').selectOption('technical')
  await operator.getByLabel('Subject').fill(subject)
  await operator.getByLabel('Message').fill('The page stays white after saving.')
  await operator.getByRole('button', { name: 'Send to the administrator' }).click()
}

test('1. a nursery sends a help request with its details attached', async () => {
  await operator.goto('/operator/help')
  await expect(operator.getByRole('heading', { name: 'Help', level: 1 })).toBeVisible()
  await operator.getByRole('button', { name: 'Contact the administrator' }).first().click()
  await expect(operator.getByText('Sent with your request: E2E Help Operator', { exact: false })).toBeVisible()
  await operator.getByRole('button', { name: 'Cancel' }).click()
  await sendRequest('White page after saving')
  await expect(operator.getByText('Sent. The administrator will answer', { exact: false })).toBeVisible()
  await expect(operator.getByRole('button', { name: /White page after saving/ })).toBeVisible()
})

test('2. offline: the request is saved on the phone and sent when the connection returns', async () => {
  await operatorContext.setOffline(true)
  await sendRequest('Sent while offline')
  await expect(operator.getByText('Saved on this phone', { exact: false })).toBeVisible()
  await expect(operator.getByText('Waiting to send')).toBeVisible()
  await operatorContext.setOffline(false)
  await expect(operator.getByText('Waiting to send')).toHaveCount(0, { timeout: 20000 })
  await operator.reload()
  await expect(operator.getByRole('button', { name: /Sent while offline/ })).toBeVisible()
})

test('3. the administrator answers in Support, adds an internal note and resolves it', async () => {
  await admin.goto('/admin/support')
  await admin.getByRole('button', { name: 'Open: White page after saving' }).click()
  await admin.getByLabel('Your reply').fill('Please update the app and try again.')
  await admin.getByRole('button', { name: 'Send reply' }).click()
  await expect(admin.getByText('Reply sent.')).toBeVisible()
  await admin.getByLabel('Your reply').fill('Seen on older phones only')
  await admin.getByLabel('Internal note: only administrators see it').check()
  await admin.getByRole('button', { name: 'Save note' }).click()
  await expect(admin.getByText('Note saved.')).toBeVisible()
  await admin.getByRole('button', { name: 'Mark as resolved' }).click()
  await expect(admin.getByText('Status saved.')).toBeVisible()
})

test('4. the nursery sees the answer (not the note) and says whether it was solved', async () => {
  await operator.goto('/operator/help')
  await operator.getByRole('button', { name: /White page after saving/ }).click()
  await expect(operator.getByText('Please update the app and try again.')).toBeVisible()
  await expect(operator.getByText('Seen on older phones only')).toHaveCount(0)
  await expect(operator.getByText('Was this solved?')).toBeVisible()
  await operator.getByRole('button', { name: 'Yes' }).click()
  await expect(operator.getByText('Answered: solved')).toBeVisible()
  await expect(operator.getByRole('button', { name: 'Reopen' })).toBeVisible()
})

test('5. a visitor uses the public contact form on the landing page', async ({ browser }) => {
  const visitor = await (await browser.newContext()).newPage()
  await visitor.goto('/#contact')
  const form = visitor.locator('#contact')
  await form.getByLabel('Your name').fill('E2E Visitor')
  await form.getByLabel('Email address').fill(uniqueEmail('e2e-visitor'))
  await form.getByLabel('Your message').fill('I registered but cannot sign in yet.')
  await form.getByRole('button', { name: 'Send message' }).click()
  await expect(form.getByText('Thank you. The administrator will answer you by email.')).toBeVisible()
})
