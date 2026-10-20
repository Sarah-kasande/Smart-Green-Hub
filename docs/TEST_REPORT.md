# Smart Green Hub: test report

Date of the runs: 20 October 2026. Environment: Windows 11, Node.js 24, MySQL 8.4.11 in Docker
(same version as the Aiven production database), Microsoft Edge (headless) for browser tests.
All tests use local test databases and fake accounts; none touch the production database
(the test setup aborts if `DB_HOST` points to Aiven).

## 1. Summary

| Test type | Tool | Result |
|-----------|------|--------|
| Unit tests: risk rules, planting formula, file signatures, tokens, test guard | Jest | 49 / 49 passed |
| API tests: auth, roles, verification, uploads, batches, sales, expenses, sync, alerts, planting, Surplus Board, hand-over, impact, admin, notifications | Jest + Supertest | 93 / 93 passed |
| **Total backend** | | **142 / 142 passed** (about 24 s) |
| End-to-end tests in a real browser (390 px mobile and 1440 px desktop) | Playwright + Edge | **11 / 11 passed** (about 40 s) |
| Accessibility, performance, best practices | Lighthouse 12 (mobile profile) | see section 4 |
| Load test: 50 concurrent users | `backend/scripts/load-test.js` | p95 243 ms, 0 errors (local) |
| Dependency audit | `npm audit --omit=dev` | frontend 0; backend 2 moderate (explained in section 5) |

## 2. Backend tests (Jest + Supertest)

| File | Tests | What is covered |
|------|-------|-----------------|
| `tests/unit/riskRules.test.js` | 37 | Every Table 5 rule and its boundaries: sales rate (incl. L = 0), days left (future, today, past), projected unsold (never negative), risk ratio (S = 0), levels at exactly 0.20 / 0.50 and just below, D = 0 with stock, S = 0, custom thresholds, suggested action at D = 29 / 28 / 8 / 7 / 0 and for overgrown batches, worked High / Medium / Low examples, rounding, DECIMAL values from MySQL; planting: 89 vs 90 days of history, no sales, no recent sales, formula example (30/month × 4 months × 1.10 − 32 = 100), never below 0, rounding up. |
| `tests/unit/utils.test.js` | 12 | PDF / PNG / JPEG signatures; Windows programs and ZIP files refused; token generation and hashing; constant-time compare; email sender parsing; the Aiven guard. |
| `tests/api/auth.test.js` | 20 | Registration (operator, institution, no self-assigned admin, duplicate email, weak password), bcrypt hashes only, hashed link tokens, email confirmation (single use), neutral login errors, HttpOnly + SameSite cookie, logout, CSRF protection, neutral "forgot password", 10-minute expiry, reset ends all sessions, language preference, audit log entries. |
| `tests/api/admin.test.js` | 7 | Admin seeding from environment variables (created once, idempotent, nothing without variables), DEMO species, role checks (401 / 403), verification queue, reject needs a reason, reject → resubmit → approve, audit trail with reasons. |
| `tests/api/uploads.test.js` | 9 | Real PNG accepted; fake PDF and mismatching types refused; over 10 MB refused; a 10 MB file stored and read back from MySQL; owner download with `no-store`; others get 404; admin access; admins cannot upload for themselves. |
| `tests/api/operator.test.js` | 26 | Approval gate; batch dates from species defaults and overrides; idempotent client_uuid; validation codes; stage changes audited; other operators cannot see a batch; stock adjustments with reason, never below zero; sales reduce stock, larger sales refused, repeats recorded once, undo restores stock (archived, not deleted); expense categories; profit or loss by species, batch and month; offline sync (applied / skipped / conflicts, sale of an offline batch, repeat upload, invalid changes refused); alerts (High alert and notification, one open alert per batch, status changes, quiet period after dismiss, email through outbox); planting suggestions with and without history; dashboard. |
| `tests/api/surplus.test.js` | 19 | Listing larger than stock refused; discounted price and expiry rules; listed plants cannot be sold; board filters; unapproved institutions blocked; request reserves plants; duplicate returns the existing request; over-request refused; **two institutions racing for the last plants: exactly one succeeds**; contact details hidden until approval; no hand-over before approval; **stock reduced only after both confirmations**; impact record; decline releases; impact for institution, nursery, admin and public (no names); withdraw cancels requests; nightly expiry; admin moderation; map pin inside Rwanda; public directory only lists consenting approved nurseries. |
| `tests/api/adminFeatures.test.js` | 12 | Admin dashboard (zeros, never invented); rules defaults, validation and audit "before → after"; species with prime-window override used by new batches; archive and restore; audit log filters; notification outbox (one row per event), unread count and mark as read; failed email visible and retried. |

Run: `cd backend && npm test`

## 3. End-to-end tests (Playwright, real browser)

Run: `cd frontend && npm run test:e2e` (starts its own API on port 5001 with the `smart_green_hub_e2e`
database and its own app on port 5174).

| # | Scenario | Result |
|---|----------|--------|
| 1 | A nursery registers in the form, opens the confirmation link from the email and signs in ("Waiting for approval") | Passed |
| 2 | The administrator approves it in the Verification Queue (desktop 1440 px) | Passed |
| 3 | The operator adds a batch of 120 plants and records a sale of 20 (total shown: RWF 10,000) | Passed |
| 4 | **Offline**: the browser goes offline, a sale of 5 is saved on the phone ("1 waiting to sync"), the browser comes back online, the sale syncs automatically and stock is exactly 95 | Passed |
| 5 | The operator posts 30 plants on the Surplus Board | Passed |
| 6 | An approved school sees "30 available" and requests 10 with a purpose | Passed |
| 7 | Operator approves → confirms hand-over (6 m² cleared) → school confirms receipt with planting site → "Hand-over complete" → shown in the school's impact page and the public figures | Passed |
| 8 | Dark mode switched on in Settings, still dark after reload, back to light | Passed |
| 9 | Landing page in English and Kinyarwanda (`lang="rw"`), impact figures loaded, no horizontal scrolling at 390 px | Passed |
| 10 | Protected pages redirect visitors to Sign in | Passed |
| 11 | Wrong password shows a clear error message | Passed |

## 4. Lighthouse (mobile profile, production build)

| Page | Performance | Accessibility | Best practices | Largest Contentful Paint |
|------|-------------|---------------|----------------|--------------------------|
| Landing `/` | 94 | 100 | 100 | 2.6 s |
| Sign in `/login` | 96 | 100 | 100 | 2.3 s |
| Register `/register` | 96 | 100 | 100 | 2.4 s |

NFR01 target LCP < 3 s: met on all three pages (local build; the live site adds network time).
Lighthouse 12 no longer has a separate "PWA" score; installability was checked through the manifest
(name, icons 192 / 512 / maskable, standalone display, start URL) and the service worker.

## 5. Security review (Phase 7)

| Item | Status |
|------|--------|
| HTTPS | Vercel and Render serve HTTPS; HSTS header on the frontend |
| Passwords | bcrypt (10 rounds); 8-128 characters with a letter and a number |
| Sessions | JWT in an HttpOnly, SameSite=Lax, Secure (production) cookie; first-party through the Vercel rewrite; token_version ends all sessions after a password reset |
| CSRF | Double-submit cookie on every POST / PUT / PATCH / DELETE (tested) |
| Role checks | On the server for every route (tested 401 / 403 / 404) |
| Input validation | express-validator on every route; offline sync changes validated with the same rules (gap found and fixed in this review) |
| Rate limiting | Login, password reset, registration, uploads, plus a general API limit |
| Headers | helmet on the API; `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS on the frontend |
| CORS | Only the configured frontend origin |
| Files | PDF / PNG / JPEG only, signature checked, 10 MB, private, `no-store` |
| Secrets | Only in environment variables; `.env` files and the CA certificate are git-ignored; the admin password is never logged (checked) |
| Data exposure | Password hashes never returned; public endpoints return no risk data, documents, notes or names in impact figures |
| Dependencies | Frontend: 0 known vulnerabilities. Backend: 2 moderate, both the same `uuid` issue inside Sequelize (missing bounds check when a caller passes its own buffer). Sequelize does not use uuid that way, and npm's only "fix" is downgrading Sequelize from version 6 to 3, so the risk is accepted and documented. |

Open points: verify `TRUST_PROXY=2` on Render (the rate limiter must see the visitor's address, not
Vercel's); daily database backups and a restore exercise before the pilot (NFR05, done in the Aiven console).

## 6. Performance (NFR01)

`node scripts/load-test.js http://localhost:5000 50 10`: 50 concurrent users, 500 reads of
`/api/health`, `/api/public/directory`, `/api/public/impact`, `/api/auth/me` after warm-up:
**median 81 ms, p95 243 ms, maximum 335 ms, 0 errors** (local API, local MySQL).
The same script can be run against the live API (`node scripts/load-test.js https://smart-green-hub.onrender.com 50 10`);
Render free-plan cold starts (up to about 50 s) are reported separately, as NFR01 requires.

## 7. Known limitations

See `docs/DEVIATIONS.md`, in particular F2 (same sales rate for two batches of one species),
W10 (web push not implemented), W16 (nightly job needs the API awake on the free plan) and the DEMO species values.
Kinyarwanda texts need review by a native speaker before the pilot.
