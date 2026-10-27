# Smart Green Hub

A free Progressive Web App (PWA) for flower and tree nurseries in Kigali. It is a decision-support
and surplus-prevention system, **not an online shop** (no cart, checkout, payments, retail search or delivery).
ALU BSc Software Engineering capstone project.

| Job | What it does |
|-----|--------------|
| **Predict** | Rule-based surplus-risk alerts (Low / Medium / High) every night and on demand. No machine learning. |
| **Redirect** | A Surplus Board where verified schools, sector offices, churches, hotels and community groups request mature plants; two-sided hand-over confirmation. |
| **Plan** | Planting suggestions from the nursery's own sales of the last 3 months. |
| **Measure** | Impact dashboards: plants redirected, hand-overs, land cleared, planting sites. |

- Live frontend: https://smart-green-hub.vercel.app (Vercel)
- Live API: https://smart-green-hub.onrender.com (Render; health check `/api/health`)
- Database: Aiven for MySQL 8.4 (SSL)

Documents: `docs/` (research proposal, `DEVIATIONS.md` = differences from the proposal, `TEST_REPORT.md`), `design/` (Figma exports).

## Roles

| Role | Can |
|------|-----|
| Nursery operator | Record batches, sales, expenses and stock changes (also offline), see alerts and planting suggestions, post surplus, decide requests, confirm hand-overs |
| Receiving institution | Browse the Surplus Board (list and map), request plants, confirm receipt, see its impact |
| Administrator | Verify nurseries and institutions, edit risk rules and species, moderate listings, read the audit log, see failed emails, run the risk check |
| Public visitor | Landing page, nursery directory (consenting, approved nurseries only), aggregate impact |

The first administrator is created automatically from `ADMIN_EMAIL` / `ADMIN_PASSWORD` when the API starts, only if no administrator exists.

## Architecture

```
Browser (React PWA, IndexedDB offline store, service worker)
   │  calls /api on its own domain
   ▼
Vercel (static app + rewrite /api/* → Render)      ← the login cookie is first-party
   ▼
Render: Node.js / Express API ── Sequelize ── Aiven MySQL
          ├─ risk engine + planting planner (rules in backend/src/services/riskRules.js)
          ├─ nightly job 02:00 Kigali (node-cron) + notification outbox every 5 min
          └─ Brevo HTTP API for email
```

Folders:

```
backend/src/
  config/        environment loading, database settings (SSL / CA certificate)
  migrations/    versioned database changes (sequelize-cli)
  models/        18 tables: the 15 ERD entities + auth_tokens, stock_adjustments, uploaded_files
  middleware/    sign-in (cookie JWT), roles, CSRF, validation, rate limits, errors
  routes/        auth, me, uploads, operator, institution, admin, public, shared (species, board, notifications)
  services/      business logic (one file per area: inventory, finance, sync, risk, planning, surplus, impact, ...)
  jobs/          scheduler (nightly risk check, email sending)
backend/tests/   Jest unit + Supertest API tests
backend/scripts/ seed-admin.js, start-e2e.js, load-test.js

frontend/src/
  api/           Axios client (CSRF header), data hook
  auth/          who is signed in, route guards
  offline/       Dexie database, outbox sync, sync status
  i18n/          en.js, rw.js (Kinyarwanda, TODO marks for review)
  theme/         light / dark mode
  components/    UI pieces (buttons, badges, cards, chart, maps)
  layouts/       public layout, app layout (sidebar on desktop, bottom bar on mobile)
  pages/         public, auth, operator, institution, admin, shared
frontend/e2e/    Playwright end-to-end tests
```

## Local development

Local development and tests use a **local MySQL 8.4** in Docker, never the production database.

1. Start the database (first time):

   ```
   docker run -d --name sgh-mysql --restart unless-stopped -p 3307:3306 -v sgh-mysql-data:/var/lib/mysql ^
     -e MYSQL_ROOT_PASSWORD=local_root_only -e MYSQL_DATABASE=smart_green_hub_dev ^
     -e MYSQL_USER=sgh_local -e MYSQL_PASSWORD=sgh_local_pw mysql:8.4 --max-allowed-packet=67108864
   docker exec sgh-mysql mysql -uroot -plocal_root_only -e "CREATE DATABASE IF NOT EXISTS smart_green_hub_test; CREATE DATABASE IF NOT EXISTS smart_green_hub_e2e; GRANT ALL ON smart_green_hub_test.* TO 'sgh_local'@'%'; GRANT ALL ON smart_green_hub_e2e.* TO 'sgh_local'@'%';"
   ```

   Later: start Docker Desktop, then `docker start sgh-mysql`.

2. Backend environment files (none are committed; see `backend/.env.example` for every name):
   - `backend/.env`: real settings (Aiven, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, ...)
   - `backend/.env.local`: overrides for local development: `DB_HOST=127.0.0.1`, `DB_PORT=3307`,
     `DB_NAME=smart_green_hub_dev`, `DB_USER=sgh_local`, `DB_PASSWORD=sgh_local_pw`, `DB_SSL=false`,
     `NODE_ENV=development`, `APP_URL=http://localhost:5173`, `CORS_ORIGIN=http://localhost:5173`.
     Email settings come from `.env` (an empty line in `.env.local` never hides a value from `.env`).
   - `backend/.env.test`: used only by `npm test`: the same local values with `DB_NAME=smart_green_hub_test`,
     a test `JWT_SECRET` and fake `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Tests stop if `DB_HOST` contains `aivencloud.com`.
   - `backend/.env.e2e`: used only by the Playwright tests: `PORT=5001`, `DB_NAME=smart_green_hub_e2e`,
     fake admin `e2e-admin@example.test` / `E2eAdmin123`, `APP_URL=http://localhost:5174`,
     `CORS_ORIGIN=http://localhost:5174`, `EMAIL_OUTBOX_FILE=e2e-emails.jsonl`, plus the local DB values above.
   - `frontend/.env`: `VITE_API_URL=/api`

3. Run:

   ```
   cd backend
   npm install
   npm run migrate
   npm run dev          # API on http://localhost:5000

   cd frontend
   npm install
   npm run dev          # app on http://localhost:5173 (Vite forwards /api to the API)
   ```

   The API log says at startup whether email is configured. Without `BREVO_API_KEY`, emails (6-digit codes,
   notifications) are printed in the API terminal and marked "skipped". In development a code email that Brevo
   refuses is also printed there, so you can still test; its status stays "failed".

## User interface

- **shadcn/ui** components (dialogs, bottom sheets, menus, Ctrl+K search, tabs, table, form fields, badges,
  toasts, charts with Recharts) live in `frontend/src/components/shadcn/` as our own code; `components.json`
  configures the `npx shadcn@latest add <name>` tool (JavaScript, alias `@/` = `src/`). Two **Magic UI** effects
  are used on the landing page (shimmer button, marquee). App-specific components are in `src/components/ui/`.
- **Colours** are the CLAUDE.md palette only: shadcn's colour names (`--primary`, `--card`, ...) point at the
  palette tokens in `src/index.css`; dark mode is `<html data-theme="dark">`. Glass panels (`.glass`,
  `.glass-strong`) are the surface colour with transparency and fall back to solid colours.
- **Font**: Manrope (self-hosted, Latin only, `src/assets/fonts/`, SIL Open Font License).
- **Photos**: Wikimedia Commons, free licences, WebP in phone and desktop sizes in `public/photos/`;
  authors and licences in `src/content/photos.js` and in the footer ("Photo credits").
- **Phones / PWA**: bottom bar + side menu, bottom sheets for forms, "Install app" in the user menu,
  home-screen shortcuts, safe areas for notched phones. Photos are cached after the first visit.
- **Demo data** for presentations (local database only): `cd backend` then
  `DEMO_PASSWORD=<password> node scripts/seed-demo.js [--fill=<operator email>]`. Everything is labelled "[DEMO]".

## Email and one-time codes

- Registration and password reset send a **6-digit code** (valid 10 minutes, single use, 5 tries, a new code
  replaces the old one, at most one per 60 s and 10 per day per account). Only an HMAC of the code is stored.
- Journey: Register → **Verify your email** (`/verify-email`, code field, "Send the code again" after 60 s,
  "Use a different email") → signed in → home page with the next step (administrator approval).
  Signing in before confirming opens the same screen. Password: Forgot password → email → code + new password.
- After a deploy the new version downloads in the background and is switched on at the next page change
  inside the app (no message is shown). If a browser still shows an old screen, reload the page (Ctrl+Shift+R).
- Every email goes through the outbox with a status `queued`, `sent`, `failed` or `skipped`.
  **Admin → Email problems** shows the counts and every failed or skipped email with Brevo's exact error and a Retry button.
- `/api/health` shows `email: configured` or `not configured` (no secret is ever shown).

## Tests

| Command | What runs |
|---------|-----------|
| `cd backend && npm test` | 233 Jest unit, API, one-time-code, outbox and frontend-backend contract tests on `smart_green_hub_test` |
| `cd frontend && npm run test:e2e` | 24 Playwright tests in Microsoft Edge (starts its own API and app) |
| `cd frontend && npm run lint` | ESLint |
| `cd backend && node scripts/load-test.js <url> 50 10` | 50-user load test (NFR01) |

Results: `docs/TEST_REPORT.md`.

## Environment variables

Render (API):

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` (Secure cookies; emails never printed) |
| `PORT` | set by Render |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Aiven connection |
| `DB_CA_CERT` | Aiven CA certificate text |
| `JWT_SECRET` | long random text |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first administrator |
| `BREVO_API_KEY` | Brevo API key that is allowed to send transactional email |
| `MAIL_FROM` | `Smart Green Hub <address verified in Brevo>` |
| `OTP_SECRET` | optional: secret for hashing codes (default: `JWT_SECRET`) |
| `APP_URL` | `https://smart-green-hub.vercel.app` (no trailing slash) |
| `CORS_ORIGIN` | `https://smart-green-hub.vercel.app` |
| `TRUST_PROXY` | `2` (Vercel + Render in front of the API) |

Vercel (frontend): `VITE_API_URL` = `/api` (Production and Preview). The project root directory must be `frontend`.

## Deployment

- **Render**: build command `npm install`, start command `npm start` (runs the migrations, then starts the API).
  Auto-Deploy "On Commit" deploys every push to `main`; otherwise use *Manual Deploy → Deploy latest commit*.
- **Vercel**: builds `frontend/` on every push; `frontend/vercel.json` rewrites `/api/*` to Render and serves the app for every other path.
- After changing a `VITE_` variable on Vercel, redeploy (Vite reads it at build time).
- Free-plan note: Render sleeps when unused (first request up to about 50 s). The nightly risk check runs only if the API is awake at 02:00; operators can use **Check now**.

## Keeping Render and Vercel on the same commit

Both services must deploy every push to `main`, so the app and the API never drift apart:

- **Render** → your service → *Settings* → *Build & Deploy*: **Auto-Deploy = On Commit**, branch **main**.
  After each push open *Events* and check that the deploy finished ("Deploy live"); a failed build keeps the old API.
- **Vercel** → your project → *Settings* → *Git*: connected to the same GitHub repository; *Production Branch* = **main**;
  root directory `frontend`.
- After a push, `https://smart-green-hub.onrender.com/api/health` shows `version` = the first 7 characters of the
  commit (also printed in the Render log as `API running on ... (version abc1234)`).
- Push changes that touch both the app and the API in **one** commit, so both deploy the same version.

## Troubleshooting

- **A page says "This part of the app is not available right now"**: the app and the API were deployed from
  different commits. Locally: restart the API (`npm run dev` in `backend`). Live: redeploy the API on Render
  (*Manual Deploy → Deploy latest commit*). Compare the `version` in `/api/health` with the latest commit on GitHub.
  Users never see version numbers; there is no banner.
- **Database up to date?** `cd backend && npx sequelize-cli db:migrate:status` (every line should say `up`).
- **Local database not reachable?** Start Docker Desktop, then `docker start sgh-mysql`.
- **Nobody receives emails**: open Admin → Email problems. "Skipped" = no `BREVO_API_KEY` is loaded.
  "Failed" shows Brevo's answer: `HTTP 401` = wrong key; `HTTP 403 permission_denied ... transactional.email`
  = the key or account may not send transactional email (fix it in Brevo); `HTTP 400` about the sender =
  `MAIL_FROM` is not a verified sender. Also check `/api/health` → `email`.

## Before the pilot

- Replace the DEMO species values with the needs-assessment results (Admin → Rules & Species).
- Have a native speaker review `frontend/src/i18n/rw.js` and `backend/src/services/emailTemplates.js` (TODO marks).
- Turn on daily backups in Aiven and do one restore exercise (NFR05).
- Confirm with RFA how forest-law provisions apply to nursery stock (proposal 3.2.3).

## Future work (not in this capstone)

Machine-learning forecasts, photo-based growth detection, SMS / USSD, mobile-money payments, delivery,
web push notifications, native apps.
