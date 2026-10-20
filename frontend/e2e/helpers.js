// Helpers for the end-to-end tests. All accounts are fake test accounts.
import fs from 'fs'
import path from 'path'
import { expect } from '@playwright/test'

const OUTBOX = path.resolve('../backend/e2e-emails.jsonl')
export const ADMIN = { email: 'e2e-admin@example.test', password: 'E2eAdmin123' }
export const PASSWORD = 'GreenTest123'
export const uniqueEmail = (prefix) => `${prefix}-${Date.now()}@example.test`

// The link (path + token) from the last email sent to this address
export async function linkFromEmail(to, kind = 'verify-email') {
  let found = null
  await expect
    .poll(() => {
      const lines = fs.existsSync(OUTBOX) ? fs.readFileSync(OUTBOX, 'utf8').trim().split('\n').filter(Boolean) : []
      const mail = lines.map((l) => JSON.parse(l)).reverse().find((m) => m.to === to && m.text.includes(`/${kind}?token=`))
      found = mail ? mail.text.match(new RegExp(`/${kind}\\?token=[a-f0-9]{64}`))[0] : null
      return found
    })
    .toBeTruthy()
  return found
}

export async function signIn(page, email, password) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

// API calls with the browser context's cookies and CSRF token (used to prepare data quickly)
export async function api(context, method, url, data) {
  await context.request.get('/api/auth/me')
  const csrf = (await context.storageState()).cookies.find((c) => c.name === 'sgh_csrf')?.value
  const res = await context.request.fetch(`/api${url}`, { method, data, headers: { 'X-CSRF-Token': csrf } })
  return { status: res.status(), body: await res.json().catch(() => null) }
}

// Registers through the API, confirms the email and lets the administrator approve
export async function approvedAccount(browser, adminContext, data) {
  const context = await browser.newContext()
  const reg = await api(context, 'POST', '/auth/register', data)
  expect(reg.status).toBe(201)
  const link = await linkFromEmail(data.email)
  await api(context, 'POST', '/auth/verify-email', { token: link.split('token=')[1] })
  await api(context, 'POST', '/auth/login', { email: data.email, password: data.password })
  const me = await api(context, 'GET', '/auth/me')
  const org = me.body.organisation
  const decision = await api(adminContext, 'POST', `/admin/verifications/${org.type}/${org.id}/decision`, { decision: 'approve' })
  expect(decision.status).toBe(200)
  return context
}

// The visible copy of a text (some texts exist twice: desktop sidebar and mobile bar)
export const visibleText = (page, text) => page.getByText(text, { exact: false }).filter({ visible: true }).first()
