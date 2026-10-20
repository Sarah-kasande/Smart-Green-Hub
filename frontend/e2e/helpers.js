// Helpers for the end-to-end tests. All accounts are fake test accounts.
import fs from 'fs'
import path from 'path'
import { expect } from '@playwright/test'

const OUTBOX = path.resolve('../backend/e2e-emails.jsonl')
export const ADMIN = { email: 'e2e-admin@example.test', password: 'E2eAdmin123' }
export const PASSWORD = 'GreenTest123'
export const uniqueEmail = (prefix) => `${prefix}-${Date.now()}@example.test`

function emailsTo(to) {
  const lines = fs.existsSync(OUTBOX) ? fs.readFileSync(OUTBOX, 'utf8').trim().split('\n').filter(Boolean) : []
  return lines.map((l) => JSON.parse(l)).filter((m) => m.to === to)
}

// The 6-digit code from the newest code email sent to this address (the code is in the subject).
// `after` = how many code emails this address had before, to wait for a NEW one.
export async function codeFromEmail(to, after = 0) {
  let found = null
  await expect
    .poll(() => {
      const codes = emailsTo(to).filter((m) => /\b\d{6}\b/.test(m.subject))
      found = codes.length > after ? codes.at(-1).subject.match(/\b(\d{6})\b/)[1] : null
      return found
    })
    .toBeTruthy()
  return found
}

export const codeEmailCount = (to) => emailsTo(to).filter((m) => /\b\d{6}\b/.test(m.subject)).length

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
  const code = await codeFromEmail(data.email)
  await api(context, 'POST', '/auth/verify-email', { email: data.email, code })
  await api(context, 'POST', '/auth/login', { email: data.email, password: data.password })
  const me = await api(context, 'GET', '/auth/me')
  const org = me.body.organisation
  const decision = await api(adminContext, 'POST', `/admin/verifications/${org.type}/${org.id}/decision`, { decision: 'approve' })
  expect(decision.status).toBe(200)
  return context
}

// The visible copy of a text (some texts exist twice: desktop sidebar and mobile bar)
export const visibleText = (page, text) => page.getByText(text, { exact: false }).filter({ visible: true }).first()
