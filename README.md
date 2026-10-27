# Smart Green Hub

**Grow what sells. Share what doesn't.**

Smart Green Hub is a free Progressive Web App for flower and tree nurseries in Kigali, Rwanda. It warns nursery
operators *before* plants become unsold surplus, and sends mature plants that would otherwise be thrown away to
schools, sector offices, churches, hotels and community greening groups that want to plant them.

It is a **decision-support and surplus-prevention system, not an online shop**: there is no cart, checkout,
payment, retail product search or delivery tracking.

ALU BSc Software Engineering capstone project.

| | |
|---|---|
| **Live app** | https://smart-green-hub.vercel.app |
| **Live API** | https://smart-green-hub.onrender.com (health check: `/api/health`) |
| **Languages** | English and Kinyarwanda |
| **Works on** | Any modern phone or computer browser; can be installed like an app; records work offline |

---

## Contents

1. [The problem](#1-the-problem)
2. [What the app does: four jobs](#2-what-the-app-does-four-jobs)
3. [Who uses it](#3-who-uses-it)
4. [How to use the app](#4-how-to-use-the-app)
5. [How the risk rules work](#5-how-the-risk-rules-work)
6. [Working offline](#6-working-offline)
7. [Accessibility, languages and design](#7-accessibility-languages-and-design)
8. [Security and privacy](#8-security-and-privacy)
9. [Technology and architecture](#9-technology-and-architecture)
10. [Running it on your computer](#10-running-it-on-your-computer)
11. [Tests](#11-tests)
12. [Environment variables](#12-environment-variables)
13. [Deployment](#13-deployment)
14. [Troubleshooting](#14-troubleshooting)
15. [Before the pilot, and future work](#15-before-the-pilot-and-future-work)
16. [Documents and credits](#16-documents-and-credits)

---

## 1. The problem

Nurseries plant seedlings months before they are sold. Each plant has a **prime window**: a period in which it is
the right size to sell and transplant. When sales are slower than expected, plants pass that window, become
overgrown, take up space and are often discarded. Meanwhile, many institutions in Kigali want trees and flowers
for greening projects but do not know where to find them.

Most small nurseries keep records on paper, so they notice the problem too late. Smart Green Hub turns the records
they already keep (batches, sales, expenses) into early warnings and a way to pass surplus plants on.

## 2. What the app does: four jobs

| Job | What it does | Where in the app |
|-----|--------------|------------------|
| **1. Predict** | Every night (and on demand) simple, explainable rules estimate how many plants of each batch will remain unsold at the end of their prime window, and rate the batch **Low / Medium / High** risk with a suggested action. No machine learning. | Nursery dashboard, **Alerts** |
| **2. Redirect** | A **Surplus Board** where nurseries post mature plants (free or discounted) and verified institutions request them. Both sides confirm the hand-over. | **Surplus Board**, **Requests** |
| **3. Plan** | Planting suggestions: how many of each species to plant next, based on the nursery's own sales of the last 3 months. | **Planting** |
| **4. Measure** | Impact dashboards: plants redirected, hand-overs, planting sites, land cleared. Only confirmed hand-overs count. | **Impact**, public landing page |

## 3. Who uses it

| Role | Who | What they can do |
|------|-----|------------------|
| **Nursery operator** | Owner or manager of a nursery | Record batches, sales, expenses and stock changes (also offline); see risk alerts and planting suggestions; post surplus; approve or decline requests; confirm hand-overs; see income, profit and impact |
| **Receiving institution** | School, sector office, church, hotel, community group | Browse the Surplus Board as a list or map; request plants; follow each request; confirm receipt; see its own impact |
| **Administrator** | Project team | Verify new nurseries and institutions; edit the risk rules and plant species; moderate listings; read the audit log; check email problems; run the risk check |
| **Public visitor** | Anyone, no account | Landing page, directory of approved nurseries (only those that agreed to be listed), total impact figures |

## 4. How to use the app

### 4.1 Getting an account

1. Open the app and choose **Register**. Pick your role (nursery or institution) and fill in the organisation's
   details (name, district, location).
2. A **6-digit code** is emailed to you. Enter it on the *Verify your email* screen (valid 10 minutes;
   "Send the code again" is available after 60 seconds).
3. You are signed in, but your organisation must first be **approved by an administrator**. Until then your
   home page shows what is pending.
4. Once approved, the full menu for your role appears.

Forgot your password? Use **Forgot password** on the sign-in page: you receive a code and choose a new password.

### 4.2 Nursery operator

| Step | Page | What to do |
|------|------|------------|
| 1 | **Batches → Add batch** | Record each group of plants of one species sown together: quantity, sowing date, stage (seedling, growing, ready, overgrown) and the dates of its prime window. |
| 2 | **Sales & Expenses** | Record each sale (batch, quantity, price) and each expense. The *Profit* tab shows income minus expenses per month. Mistakes can be undone. |
| 3 | **Dashboard** | See the batch most at risk in the **Act now** card, the number of batches per risk level, a timeline of prime windows, requests waiting for you and income vs expenses. |
| 4 | **Alerts** | Every batch at Medium or High risk, with the numbers behind it and a suggested action. Mark an alert acknowledged, resolved or dismissed. Use **Check now** to recalculate immediately. |
| 5 | **Surplus Board** | Post plants you cannot sell in time: quantity, free or discounted price, and an end date. You can withdraw a listing. |
| 6 | **Requests** | Approve or decline requests from institutions. After giving the plants, confirm the hand-over. |
| 7 | **Planting** | See how many of each species to plant next. |
| 8 | **Impact** | Plants redirected, hand-overs and planting sites from your nursery. |
| — | **Sync** | Shows changes recorded offline that are still waiting to be sent, and any that the server refused. |

### 4.3 Receiving institution

| Step | Page | What to do |
|------|------|------------|
| 1 | **Dashboard** | See open requests as steps (*Requested → Approved → Handed over → Received*) and plants available in your district on a map. |
| 2 | **Surplus Board** | Browse listings as a list or on the map; filter by plant type and district. Choose **Request plants**, enter the quantity and what the plants are for (for example, greening the school compound). |
| 3 | **My requests** | Follow each request. When the plants arrive, **confirm receipt**. You can cancel a request before it is fulfilled. |
| 4 | **Impact** | Plants received per month, hand-overs and planting sites. |

### 4.4 Administrator

| Page | What to do |
|------|------------|
| **Dashboard** | A *Needs your attention* list (organisations to verify, email problems) and the total impact. |
| **Verification** | Approve or reject new nurseries and institutions after checking their details and documents. |
| **Rules & Species** | Change the risk rule values (section 5) and the plant species list (growing time, prime window). |
| **Listings** | See and moderate every Surplus Board listing. |
| **Audit log** | Who changed what and when. |
| **Email problems** | Emails that failed or were skipped, with the exact reason and a *Retry* button. |

### 4.5 One hand-over from start to finish

```
Nursery posts 300 seedlings on the Surplus Board            listing: active
School requests 100                                          request: pending   (100 plants reserved)
Nursery approves                                             request: approved
Nursery gives the plants and confirms "handed over"
School confirms "received"                                   request: fulfilled
   → only now: the batch stock goes down by 100 and an impact record is created
Nightly job: listings past their end date                    listing: expired
```

- A request **reserves** plants straight away, so two institutions cannot be promised the same plants. This runs
  in a database transaction with the listing locked.
- Each institution can make **one request per listing**.
- Stock is reduced permanently **only after both sides confirm**.

### 4.6 Everyday features

- **Search (Ctrl+K)**: jump to any page or quick action (Add batch, Record sale, ...).
- **Notifications**: the bell in the top bar; important events are also emailed.
- **Settings**: profile, appearance (light / dark / system) and organisation details, in tabs.
- **Language switch**: EN | Kinyarwanda on every screen.
- **Install the app**: user menu → *Install app* (Android / Chrome / Edge). On an iPhone: Share → *Add to Home
  Screen*. Long-press the installed icon for shortcuts: Add batch, Record sale, Surplus Board.

## 5. How the risk rules work

The rules are plain arithmetic, so an operator can check every alert by hand. The values in brackets are the
defaults; the administrator can change them in **Rules & Species**.

| Symbol | Meaning |
|--------|---------|
| **L** | Lookback period (28 days) |
| **S** | Plants currently in the batch |
| **r** | Sales rate = units of this species sold by the nursery in the last L days ÷ L |
| **D** | Days left = end of the prime window − today (0 if it has passed) |
| **U** | Projected unsold = max(0, S − r × D) |
| **R** | Risk ratio = U ÷ S |

**Risk level:** **High** if the window has ended with plants left (D = 0 and S > 0) or R ≥ 0.50;
**Medium** if 0.20 ≤ R < 0.50; otherwise **Low**.

**Suggested action:**
- D ≤ 7 days or the batch is overgrown: *post to the Surplus Board or donate*
- D between 8 and 28 days: *discount or transplant*
- D > 28 days: *reduce the next planting or discount*

**Worked example.** A batch has S = 200 plants. The nursery sold 56 of this species in the last 28 days, so
r = 56 ÷ 28 = 2 per day. The prime window ends in D = 20 days. Projected unsold U = 200 − 2 × 20 = 160, so
R = 160 ÷ 200 = 0.80, which is **High**. As D is 20, the suggestion is *discount or transplant*.

**Planting suggestion** = average monthly sales over the last 3 months × growing time in months × 1.10
(10 % safety margin) − plants already growing, never below 0. Example: 60 a month × 4 months × 1.10 = 264,
minus 100 already growing = **164 to plant**. If a species has less than 3 months of sales history, the app says so
instead of guessing.

The rules are in `backend/src/services/riskRules.js` and covered by unit tests.

## 6. Working offline

Nurseries often have weak mobile data, so recording batches, sales and expenses works **without a connection**:

1. Each change is saved on the phone (IndexedDB) with a unique ID (`client_uuid`) and sent as soon as possible.
2. A chip in the top bar shows **Online**, **Offline** or **N waiting to sync**.
3. Sync runs when the app opens, when the connection returns and every minute.
4. The unique ID means a change is never applied twice, even if it is sent again.
5. If the server refuses a change (for example, a sale larger than the stock), it stays on the **Sync** page with
   the reason.

Lists of batches and species are kept on the phone, so they also show offline. Signing out clears the phone's copy.

## 7. Accessibility, languages and design

- **Mobile first** (designed at 390 px, with desktop layouts at 1440 px), touch targets of at least 48 px.
- Risk is always shown as a **word and an icon** (Low / Medium / High), never by colour alone.
- **English and Kinyarwanda**; translations still to be checked by a native speaker are marked `TODO` in
  `frontend/src/i18n/rw.js`.
- **Light and dark mode**; animations are switched off for users who ask for reduced motion.
- Lighthouse accessibility score: **100** on every page measured.
- **Colours**: ink `#1B3350`, green `#2E7D32`, teal `#1F8A7A`, background `#F5F6F8`, with amber and red tints for
  Medium and High risk.
- **Font**: Manrope, stored with the app so it also works offline.
- **Components**: shadcn/ui (dialogs, bottom sheets on phones, menus, search, tabs, tables, toasts, charts on
  Recharts) and two Magic UI effects on the landing page. They are copied into
  `frontend/src/components/shadcn/` as our own code.
- **Photos**: from Wikimedia Commons under free licences, in phone and desktop sizes; credits in the footer.

## 8. Security and privacy

- Passwords are hashed with bcrypt and never stored or logged in plain text.
- Sign-in uses a JWT in an http-only cookie, plus CSRF protection, rate limits, input validation and security
  headers (helmet).
- Email codes are single-use, expire after 10 minutes and are stored only as a hash.
- Every role sees only its own data; important actions are written to the audit log.
- The public sees only nurseries that agreed to be listed, and only total impact figures.
- No secrets are in the repository; `.env` files and certificates are ignored by git.

## 9. Technology and architecture

| Part | Technology | Hosted on |
|------|------------|-----------|
| Frontend | React, Vite, Tailwind CSS v4, shadcn/ui, React Router, Axios, Dexie (IndexedDB), Leaflet + OpenStreetMap, vite-plugin-pwa (Workbox) | Vercel (service `frontend`) |
| Backend | Node.js, Express, Sequelize, JWT, bcryptjs, helmet, Brevo (email) | Vercel (service `backend`); Render also supported |
| Database | MySQL 8.4 with SSL | Aiven |
| Tests | Jest, Supertest, Playwright, Lighthouse | — |

```
Browser (React PWA, IndexedDB offline store, service worker)
   │  one domain: https://<project>.vercel.app
   ▼
Vercel project (root vercel.json, two services)
   ├─ /api/*      → service "backend"  : Express API as a Vercel Function ── Sequelize ── Aiven MySQL
   │                  ├─ risk engine + planting planner (backend/src/services/riskRules.js)
   │                  ├─ emails through the Brevo HTTP API, sent right after each action
   │                  └─ /api/cron/nightly, called by Vercel Cron at 02:00 Kigali time:
   │                     expire listings, run the risk check, retry waiting emails
   └─ everything else → service "frontend": the built React app (static files)
```

The app and the API share one domain, so the sign-in cookie is first-party and the app simply calls `/api`.
The API can also run as a normal server (`backend/src/server.js`, with node-cron for the scheduled jobs): that is
what `npm run dev` does locally, and what the earlier Render deployment used.

The database has the 15 entities of the proposal (users, institutions, nurseries, plant species, batches, sales,
expenses, risk alerts, surplus listings, surplus requests, impact records, rule settings, planting
recommendations, notifications, audit logs) plus three supporting tables (sign-in tokens, stock adjustments,
uploaded files).

```
backend/src/
  config/        environment loading, database settings (SSL / CA certificate)
  migrations/    versioned database changes (sequelize-cli)
  models/        18 tables
  middleware/    sign-in, roles, CSRF, validation, rate limits, errors
  routes/        auth, me, uploads, operator, institution, admin, public, shared
  services/      business logic, one file per area (inventory, finance, sync, risk, planning, surplus, impact, ...)
  jobs/          scheduler (nightly risk check, email sending)
backend/tests/   Jest unit and Supertest API tests
backend/scripts/ seed-admin.js, seed-demo.js, start-e2e.js, load-test.js
scripts/dev.js   starts the database, API and app together (npm run dev in the root folder)

frontend/src/
  api/           Axios client (CSRF header), data hook
  auth/          who is signed in, route guards
  offline/       Dexie database, outbox sync, sync status
  i18n/          en.js, rw.js
  theme/         light / dark mode
  components/    shadcn/ (base components), ui/ (app components), charts/, map/
  layouts/       public layout; signed-in layout (sidebar on desktop, bottom bar on phones)
  pages/         public, auth, operator, institution, admin, shared, account
  content/       photo credits
frontend/e2e/    Playwright end-to-end tests
```

## 10. Running it on your computer

Local development and tests use a **local MySQL 8.4 in Docker**, never the production database.

**Requirements:** Node.js 20 or newer, Docker Desktop, Git.

1. **Start the database** (first time only):

   ```
   docker run -d --name sgh-mysql --restart unless-stopped -p 3307:3306 -v sgh-mysql-data:/var/lib/mysql ^
     -e MYSQL_ROOT_PASSWORD=local_root_only -e MYSQL_DATABASE=smart_green_hub_dev ^
     -e MYSQL_USER=sgh_local -e MYSQL_PASSWORD=sgh_local_pw mysql:8.4 --max-allowed-packet=67108864
   docker exec sgh-mysql mysql -uroot -plocal_root_only -e "CREATE DATABASE IF NOT EXISTS smart_green_hub_test; CREATE DATABASE IF NOT EXISTS smart_green_hub_e2e; GRANT ALL ON smart_green_hub_test.* TO 'sgh_local'@'%'; GRANT ALL ON smart_green_hub_e2e.* TO 'sgh_local'@'%';"
   ```

   Later: start Docker Desktop, then `docker start sgh-mysql`.

2. **Create the environment files** (none are committed; `backend/.env.example` lists every name):
   - `backend/.env`: real settings (`JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, email, ...)
   - `backend/.env.local`: local overrides: `DB_HOST=127.0.0.1`, `DB_PORT=3307`, `DB_NAME=smart_green_hub_dev`,
     `DB_USER=sgh_local`, `DB_PASSWORD=sgh_local_pw`, `DB_SSL=false`, `NODE_ENV=development`,
     `APP_URL=http://localhost:5173`, `CORS_ORIGIN=http://localhost:5173`. An empty line here never hides a value
     from `.env`.
   - `backend/.env.test`: only for `npm test`: the same local values with `DB_NAME=smart_green_hub_test`, a test
     `JWT_SECRET` and fake admin details. Tests refuse to run against Aiven.
   - `backend/.env.e2e`: only for Playwright: `PORT=5001`, `DB_NAME=smart_green_hub_e2e`, a fake admin
     (`e2e-admin@example.test` / `E2eAdmin123`), `APP_URL` and `CORS_ORIGIN` = `http://localhost:5174`,
     `EMAIL_OUTBOX_FILE=e2e-emails.jsonl`, plus the local database values.
   - `frontend/.env`: `VITE_API_URL=/api`

3. **Run everything with one command**, from the project root folder (`Smart-Green-Hub`, not `backend` or
   `frontend`):

   ```
   npm run dev
   ```

   This single command (`scripts/dev.js`, no extra packages):
   - installs the backend and frontend packages if they are missing;
   - starts the database container and waits until MySQL is ready;
   - applies new database migrations;
   - starts the **API** (http://localhost:5000) and the **app** (http://localhost:5173) together, with `[api]`
     and `[app]` in front of their messages.

   Open http://localhost:5173. **Ctrl+C stops both.** If one of them crashes, the other is stopped too, so you never
   end up with half the app running. If the API or the app is already running in another terminal, the command
   says so and stops; close the other one first. Using a database that is not the local Docker one:
   `npm run dev -- --no-db`.

   Other commands from the root folder: `npm run setup` (install all packages), `npm test` (backend and browser
   tests), `npm run lint`.

   You can still start each part on its own: `cd backend` then `npm run dev`, and `cd frontend` then `npm run dev`.

   The first administrator is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` when the API starts, only if no
   administrator exists. Without `BREVO_API_KEY`, emails (including the 6-digit codes) are printed in the API
   terminal instead of being sent.

4. **Demo data** (optional, for presentations; local database only):

   ```
   cd backend
   DEMO_PASSWORD=<choose a password> node scripts/seed-demo.js [--fill=<operator email>]
   ```

   It creates sample nurseries, institutions, batches, sales and hand-overs. Every demo name starts with
   **[DEMO]** so it can never be mistaken for real data. The script refuses to run against the production
   database unless `--allow-production` is given.

## 11. Tests

| Command | What runs |
|---------|-----------|
| `cd backend && npm test` | 233 Jest unit and API tests (risk rules, planting, sync, surplus, codes, email outbox, ...) on the test database |
| `cd frontend && npm run test:e2e` | 24 Playwright tests in Microsoft Edge at phone and desktop size (starts its own API and app) |
| `cd frontend && npm run lint` | ESLint |
| `cd backend && node scripts/load-test.js <url> 50 10` | 50-user load test (NFR01) |

All tests pass. Results, including Lighthouse scores, are in `docs/TEST_REPORT.md`.

## 12. Environment variables

**Vercel (one project, both services).** Set these in *Project → Settings → Environment Variables*, for the
**Production** environment (Vercel gives them to every service):

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Aiven connection |
| `DB_CA_CERT` | Aiven CA certificate text |
| `JWT_SECRET` | long random text |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first administrator |
| `BREVO_API_KEY` | Brevo key allowed to send transactional email |
| `MAIL_FROM` | `Smart Green Hub <address verified in Brevo>` |
| `OTP_SECRET` | optional: secret for hashing codes (default: `JWT_SECRET`) |
| `APP_URL` | the project's address, e.g. `https://smart-green-hub.vercel.app` (no trailing slash) |
| `CORS_ORIGIN` | the same address |
| `TRUST_PROXY` | `1` (only Vercel in front of the API) |
| `CRON_SECRET` | random text of at least 16 characters; Vercel sends it to the nightly job |
| `VITE_API_URL` | `/api` |

`PORT` is not needed on Vercel. Never set `DB_CA_PATH`, `ENV_FILE` or `EMAIL_OUTBOX_FILE` there.

**Render (only if the API runs on Render instead):** the same names without `CRON_SECRET` and `VITE_API_URL`,
with `PORT` set by Render and `TRUST_PROXY` = `2`.

## 13. Deployment

### On Vercel (frontend and API in one project)

The root `vercel.json` defines two **services** in one Vercel project. **One `git push` to `main` builds and
deploys both together**, so the app and the API are always the same version.

| Service | Folder | Public path | What Vercel does |
|---------|--------|-------------|------------------|
| `backend` | `backend/` | `/api/*` | Runs `npm run vercel-build` (database migrations, production only), then runs the Express API from `src/vercel.js` as a function |
| `frontend` | `frontend/` | everything else | Builds the React app with Vite; unknown paths return `index.html` so React Router can show the page |

No service calls another service from the server side (the browser calls `/api` itself), so there are no
service bindings.

**Setting it up (once):**
1. Vercel → *Add New → Project* → import the GitHub repository. Leave **Root Directory empty** (the repository
   root): Vercel reads `vercel.json` and shows the two services.
2. Add the environment variables from section 12 (Production).
3. Deploy. Then open `https://<project>.vercel.app/api/health`: it must show `database: connected` and the
   `version` of the latest commit.
4. In *Settings → Cron Jobs* you should see `/api/cron/nightly`. Vercel's schedule is in UTC: `0 0 * * *` is
   02:00 in Kigali. On the free (Hobby) plan a cron job runs once a day, sometime within that hour.
5. Aiven must accept connections from Vercel: in the Aiven console, check *Allowed IP addresses*
   (`0.0.0.0/0` if it was opened for Render).
6. When everything works, the old Render service and the old frontend-only Vercel project can be switched off.

**Good to know:**
- Migrations run during the production build. If one fails, the deployment fails and the old version stays live.
  Preview deployments never run migrations.
- Emails are sent right after each action; Vercel keeps the function running until they are sent
  (`waitUntil`). Emails that failed are retried by the nightly job (or with *Retry* in Admin → Email problems).
- On Vercel there is no sleeping server: the first request after a quiet period takes a second or two, not 50.
- After changing a `VITE_` variable, redeploy (it is read at build time).
- After a deploy the new app version downloads in the background and switches on at the next page change.

### On Render (the earlier setup, still supported)

- **Render** (API): root directory `backend`, build command `npm install`, start command `npm start` (runs the
  migrations, then starts `src/server.js` with node-cron). Auto-Deploy *On Commit* for branch `main`.
- **Vercel** (app only): a project with root directory `frontend`; `frontend/vercel.json` sends `/api/*` to Render.
- Free-plan note: Render sleeps when unused, so the first request can take up to about 50 seconds.

The root `package.json` and `scripts/dev.js` are for local development only.

## 14. Troubleshooting

- **"This part of the app is not available right now"**: the app and the API are on different versions. On
  Vercel (one project) this cannot happen after a full deploy; redeploy the latest commit. With Render: *Manual
  Deploy → Deploy latest commit*. Locally: stop and run `npm run dev` again.
- **Vercel deployment failed during the build of `backend`**: open the build log. "Build: running database
  migrations" followed by an error means the database is not reachable (check the `DB_` variables and Aiven's
  allowed IP addresses) or a migration failed.
- **The nightly job does not run on Vercel**: check that `CRON_SECRET` is set, then open *Settings → Cron Jobs →
  View Logs*. A `401` answer means the secret is missing or different.
- **An old screen after a deploy**: reload with Ctrl+Shift+R.
- **Database up to date?** `cd backend && npx sequelize-cli db:migrate:status` (every line should say `up`).
- **Local database not reachable?** Start Docker Desktop, then `docker start sgh-mysql`.
- **`npm` says ENOENT / package.json not found**: you are in the wrong folder. Run `npm run dev` from the
  project root (`Smart-Green-Hub`).
- **"Port 5000 (or 5173) is already in use"**: the API or the app still runs in another terminal; stop it with
  Ctrl+C there, then run `npm run dev` again.
- **Nobody receives emails**: open Admin → *Email problems*. "Skipped" means no `BREVO_API_KEY` is loaded.
  "Failed" shows Brevo's answer: `HTTP 401` = wrong key; `HTTP 403 ... transactional.email` = the account may
  not send transactional email; `HTTP 400` about the sender = `MAIL_FROM` is not a verified sender.

## 15. Before the pilot, and future work

**Before a real pilot:**
- Replace the demo species values with the needs-assessment results (Admin → Rules & Species).
- Have a native speaker review `frontend/src/i18n/rw.js` and `backend/src/services/emailTemplates.js`
  (`TODO` marks).
- Turn on daily backups in Aiven and test one restore (NFR05).
- Confirm with the Rwanda Forestry Authority how forest-law provisions apply to nursery stock (proposal 3.2.3).
- Improve loading speed on low-end phones (currently 3.0–3.9 s to show the main content; target under 3 s),
  for example by pre-rendering the landing page.

**Future work (outside this capstone):** machine-learning forecasts, photo-based growth detection, SMS / USSD,
mobile-money payments, delivery, web push notifications, native apps.

## 16. Documents and credits

- `docs/Sarah_Kasande_Research_Proposal.docx.pdf`: the research proposal (requirements FR01–FR18, NFR01–NFR06,
  data model, risk rules, workflows)
- `docs/DEVIATIONS.md`: every difference from the proposal and the reason
- `docs/TEST_REPORT.md`: test and Lighthouse results
- `design/`: the original Figma screens
- Photos: Wikimedia Commons contributors (CC0, CC BY 4.0, CC BY-SA 4.0); authors listed in
  `frontend/src/content/photos.js` and in the app footer
- Font: Manrope, SIL Open Font License (`frontend/src/assets/fonts/OFL-LICENSE.txt`)
- Maps: © OpenStreetMap contributors

Author: Sarah Kasande, African Leadership University.
