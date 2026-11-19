# Smart Green Hub

**Grow what sells. Share what doesn't.**

Smart Green Hub is a free Progressive Web App for flower and tree nurseries in Kigali, Rwanda. It warns nursery
operators *before* plants become unsold surplus, and sends mature plants that would otherwise be thrown away to
schools, sector offices, churches, hotels and community greening groups that want to plant them.

It is a **decision-support and surplus-prevention system, not an online shop**: there is no cart, checkout,
payment, retail product search or delivery tracking.

ALU BSc Software Engineering capstone project.


Link to the Demo: https://drive.google.com/file/d/1aEGkOR0qwfKxIRA8WfbiV072qqosOMpU/view?usp=sharing

| | |
|---|---|
| **Live app** | https://smart-green-hub-113q.vercel.app |
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
| **2. Redirect** | A **Surplus Board** where nurseries post mature plants (free or discounted) and verified institutions request them. Approved institutions also see **Available plants**: ready plants nurseries can supply (section 4.8). Request and approve only, never a shop. Both sides confirm the hand-over. | **Surplus Board**, **Requests** |
| **3. Plan** | Planting suggestions: how many of each species to plant next, based on the nursery's own sales of the last 3 months. | **Planting** |
| **4. Measure** | Impact dashboards: **surplus redirected** and **plants supplied for greening** (kept apart), hand-overs, planting sites, land cleared. Only confirmed hand-overs count. | **Impact**, public landing page |

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
| 1 | **Batches → Add batch** | Record each group of plants of one species sown together: species, quantity, sowing date and price. The ready date and prime window are calculated from the administrator's species rules; nurseries cannot change them. A plant that is not in the list: choose **My species is not listed** and give its name, plant type and (optional) local name. If a similar species exists, the app asks *Did you mean ...?* first. The batch is saved at once and shows **Waiting for species approval** until the administrator decides (see 4.7). |
| 2 | **Sales & Expenses** | Record each sale (batch, quantity, price) and each expense. The *Profit* tab shows income minus expenses per month. Mistakes can be undone. |
| 3 | **Dashboard** | See the batch most at risk in the **Act now** card, the number of batches per risk level, a timeline of prime windows, requests waiting for you and income vs expenses. |
| 4 | **Alerts** | Every batch at Medium or High risk, with the numbers behind it and a suggested action. Mark an alert acknowledged, resolved or dismissed. Use **Check now** to recalculate immediately. |
| 5 | **Surplus Board** | Post plants you cannot sell in time: quantity, free or discounted price, and an end date. You can withdraw a listing. |
| 6 | **Requests** | Approve or decline requests from institutions. After giving the plants, confirm the hand-over. The page opens on **all** requests, newest first; fulfilled, declined and cancelled ones stay as history with their dates. |
| 7 | **Planting** | See how many of each species to plant next. |
| 8 | **Impact** | Plants redirected, hand-overs and planting sites from your nursery. |
| — | **Sync** | Shows changes recorded offline that are still waiting to be sent, and any that the server refused. |
| — | **Help** | *Contact the administrator* and follow the answers in *My messages* (section 4.10). Also in the user menu, and open before approval. |

### 4.3 Receiving institution

| Step | Page | What to do |
|------|------|------------|
| 1 | **Dashboard** | See open requests as steps (*Requested → Approved → Handed over → Received*) and plants available in your district on a map. |
| 2 | **Surplus Board** | Two views: **Surplus offers** (listings posted by nurseries) and **Available plants** (ready plants nurseries can supply). Both as cards or on the map; filter by district, plant type, species and minimum quantity. Choose **Request plants**, enter the quantity, what the plants are for, and optionally a preferred pickup date and a message. |
| 3 | **My requests** | Follow each request. When the plants arrive, **confirm receipt**. You can cancel a request before it is fulfilled. Every request stays in the list as history (filter by status). |
| 4 | **Impact** | Plants received per month, hand-overs and planting sites. |
| — | **Help** | *Contact the administrator* and follow the answers in *My messages* (section 4.10). |

### 4.4 Administrator

| Page | What to do |
|------|------------|
| **Dashboard** | A *Needs your attention* list (organisations to verify, species requests, email problems) and the total impact. |
| **Verification** | Approve or reject new nurseries and institutions after checking their details and documents. |
| **Species requests** | Species proposed by nurseries (the menu shows how many wait). Opens on **All**, with counts per status; decided requests stay visible with who decided, when and why. Approve with the growing time and prime window, reject with a reason, or merge a spelling duplicate into an existing species (see 4.7). |
| **Rules & Species** | Change the risk rule values (section 5) and the approved plant species (growing time, prime window). Only the administrator sets species rules. The page also shows how many species requests wait. |
| **Listings and plants** | Two views. *Surplus listings*: every Surplus Board listing (all statuses), with *Withdraw*. *Available plants*: every batch of every approved nursery with stage, stock, free quantity, price per plant and whether institutions see it. Search and filter by nursery, species, stage and status. |
| **Sales** | Every sale recorded by every nursery, including sales synced from offline: totals (RWF, number of sales, plants sold) for today, this week, this month, this year or custom dates, the sales table, a breakdown by nursery and by species, and **Export CSV** (each export is written to the audit log). Totals are calculated on the server over all matching sales; a sale the nursery removes is no longer counted. |
| **Nurseries, Batches, Institutions** | The main records, each as a table (cards on phones) with search, *Active / Archived / All* with counts, and a detail view. **Edit** changes only safe fields (names, contact details, district, sector; for a batch the price per plant and a quantity correction with a reason). **Archive** (reason required) hides the record from use but keeps all history; **Unarchive** restores it. **Delete** is permanent and only works when nothing is linked; otherwise the page explains why and offers Archive. Everything is in the audit log (section 4.9). |
| **Batches → Publish** | Put ready batches on the public homepage, one at a time or several together, and choose a *Featured* position. Only batches with free plants, from approved nurseries that agreed, can be published (section 4.9). |
| **Support** | Help requests from nurseries, institutions and the public contact form (the menu shows how many are open). Reply, add internal notes, mark *In progress* or *Resolved* (section 4.10). |
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

### 4.7 A species that is not in the list

1. **Nursery:** *Add batch → My species is not listed* → name, plant type (Flowers, Trees, Shrubs, Other plants),
   optional local or Kinyarwanda name. No growing time or prime window: only the administrator sets those.
   Names are compared ignoring capital letters, spaces and accents: the same name reuses the existing species,
   a close name asks *Did you mean ...?*. The species request and the batch are saved together.
2. **While waiting:** the batch counts in stock and appears in *Batches* as *Waiting for species approval*, but it
   has no ready date yet, so it gets no alerts, no planting suggestion and cannot go on the Surplus Board. The
   species shows only in this nursery's dropdown, marked *waiting for approval*. The administrator gets an
   in-app notification and an email.
3. **Administrator (Species requests):**
   - *Approve:* confirm the name and plant type, enter days to ready and prime-window days. Every batch of the
     species gets its dates from its planting date; a batch planted long ago can become *ready* or *overgrown*
     at once and then gets alerts normally. The species is now in every nursery's list.
   - *Reject:* a reason is required. The nursery is notified; its batch shows *Species rejected: choose another
     species* and keeps its stock.
   - *Merge:* for a spelling duplicate. The batches move to the existing species and get its dates.
   Every decision is in the audit log, and the nursery is notified (in-app and email).

### 4.8 Available plants (more outlets for nurseries)

Besides surplus offers, approved institutions see **Available plants**: batches that are *ready* (or
*overgrown*) and can be supplied now. It works exactly like a surplus request (request → nursery approves or
declines with a reason → both confirm the hand-over → stock goes down). It is **not a shop**: no cart, no
checkout, no payment, no price comparison, no delivery tracking.

- **What institutions see:** species, plant type, the quantity that is truly free (stock minus plants on
  active listings and in open requests), the nursery's name, district and sector, the price per plant if the
  nursery entered one, and the earliest pickup date. **Never** sales, expenses, risk level, alerts, total
  stock or the phone number (contact details are shared only after a request is approved).
- **Nursery control:** every batch has **Show to institutions** (on by default; Add batch and the batch page),
  and *Settings → Nursery details → Available plants* switches it off for the whole nursery. Hiding a batch
  stops new requests; requests already open continue. Batches waiting for species approval never appear.
- **Requests page:** each request is marked **Surplus offer** or **Available plant**; the nursery handles both
  in one place.
- **Only approved institutions** can see or request available plants. Public visitors see no stock.
- **Impact stays honest:** a hand-over from a surplus offer, or of a batch that was overgrown or had an open
  risk alert, counts as **surplus redirected**; plants from healthy stock count as **supplied for
  greening** and are never called saved from waste.

### 4.9 Managing records and the public homepage

**Archive, unarchive, delete** (administrator: Nurseries, Batches, Institutions)

- **Archive** is the soft delete (`archived_at`, FR16). A reason is required, and the person is told by email and
  in-app notification.
  - **Archived nursery:** cannot sign in or post, and disappears from the directory, the Surplus Board,
    Available plants, the homepage and the risk job.
  - **Archived institution:** cannot sign in or request.
  - **Archived batch:** leaves stock, alerts, listings and the homepage.
  - **History stays:** sales, requests and impact are kept for reports and for the other side's history.
- **What is still promised is released in the same transaction:** open requests are cancelled and open listings
  withdrawn, with a notification to the other side. Stock was never reduced for an open request (only after both
  sides confirm), so those plants are simply free again.
- **Unarchive** restores the record. Cancelled requests stay cancelled: the other side was already told, and the
  plants may have been promised elsewhere since.
- **Delete** is permanent and only allowed when nothing is linked (no batches, sales, expenses, listings, requests,
  species requests, stock changes or alerts). Otherwise it is refused and the page offers Archive.
- **The audit log is never deleted.** Every account is in it from the day it registered, so for a deleted
  nursery or institution the account row stays only as an anonymous placeholder: name, email and phone erased,
  signed out, archived.

**Plants available now** (public homepage)

- **Nursery consent:** a nursery switches on *Settings → Nursery details → Allow my plants to appear on the public
  homepage* (off by default). Switching it off removes all its batches from the homepage at once.
- **Publishing:** the administrator publishes ready batches with free plants from approved, non-archived nurseries
  that agreed, and chooses a *Featured* position (1 first).
- **The public card shows only:** species, plant type, quantity available, price per plant (if set), end of the
  prime window (with a progress bar), nursery name and district. Never phone, email, sales, risk, alerts, total
  stock or exact location.
- **Cards disappear by themselves** when the batch is sold out, archived, unpublished or no longer ready. The
  endpoint is rate-limited and cached for 60 seconds.
- **Request and approve only:** visitors see *Sign in to request*, and signed-in institutions see *Request*, which
  opens Available plants. There is no payment or delivery step.

### 4.10 Help and support

**For nurseries and institutions**

- **Contact the administrator:** open *Help* (menu or user menu) and fill in the category (Account, Batches,
  Requests, Sales, Technical problem, Other), subject, message, and an optional screenshot (PNG or JPEG, up to 5 MB).
  Your name, role, organisation and email are attached automatically. *Help* also works for accounts that are
  still waiting for approval.
- **Works offline:** the request is saved on the phone and sent when the connection returns. A client_uuid makes
  sure it is never sent twice.
- **My messages:** each request with its status (*Open*, *In progress*, *Resolved*) and the conversation. You can
  reply while it is open. A resolved request can be reopened within 14 days, and you may answer *Was this solved?*

**For visitors (not signed in)**

- **Public contact form:** on the landing page and the sign-in screen (*Cannot sign in? Contact the
  administrator*), with name, email and message. No account is needed.
- **Spam protection:** at most 5 messages per hour from one address, and a hidden honeypot field that only robots
  fill.
- **Replies:** the administrator answers visitors by email.

**For the administrator: Support**

- **The list:** newest first, with search and filters by status, category and role, and an open-count badge on
  the menu.
- **The detail:** the whole conversation, a reply box, internal notes that users never see, and *Mark as in
  progress / resolved*.

**Notifications and privacy**

- **Notifications** use the existing in-app notifications and email outbox. The administrator hears about new
  requests, replies and reopened requests; the user hears about answers and resolution. The email never contains
  the message itself.
- **Privacy:** a user only ever sees their own requests, and messages and screenshots are never public.
- **Records:** every administrator action is in the audit log. Requests are never deleted, also when the account
  is archived; they count as history, so such an account can be archived but not deleted.

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
- The public homepage shows a batch only when its nursery agreed (off by default), and only species, plant
  type, quantity, price, prime-window end, nursery name and district. That endpoint is rate-limited.
- An archived nursery or institution is signed out at once and cannot sign in until it is unarchived.
- The administrator can see every nursery's sales records and totals (to measure impact and support small
  nurseries). Nurseries are told this on the registration form and in Settings; every CSV export is audited.
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
uploaded files) and the two tables of the support module that the proposal did not list (support tickets and
support messages, docs/DEVIATIONS.md W51). Species proposed by nurseries are ordinary plant-species rows with a `status`
(approved, pending, rejected, merged) and who requested and decided them (docs/DEVIATIONS.md W39); no extra table.

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
backend/scripts/ seed-admin.js, seed-demo.js, seed-species.js, start-e2e.js, load-test.js
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

> **The live database holds REAL data only.** The live database is Aiven MySQL on the free plan, which allows
> exactly one database, `defaultdb`. Nothing fake ever goes into it: no demo species, test users, test nurseries
> or sample batches. It contains only (1) the tables created by the migrations, (2) the default risk rule
> (Table 5: lookback 28 days, Medium from 20 %, High from 50 %, safety margin 10 %, far 28 days, near 7 days) and
> (3) the administrator created from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. The administrator adds the real plant
> species in *Rules & Species* (or approves the ones nurseries propose); until then *Planting plan* says
> "No species yet" and *Add batch* offers only "My species is not listed".
>
> The code enforces this (`backend/src/utils/dbSafety.js`): a database counts as **live** when its host is not
> this computer, or when its name is `defaultdb`. Against a live database, `npm test`, the Playwright tests,
> `seed-demo.js`, `seed-species.js`, the load test and `npm run migrate:undo` all **refuse to run**, with no way
> around it. Migrations reach the live database only with `npm run migrate:live` (or `npm start` on Render).

Local development and tests use a **local MySQL Server 8** installed on your computer, never the live database.

**Requirements:** Node.js 20 or newer, MySQL Server 8 (MySQL Community Server; on Windows it runs as the
`MySQL80` service and starts with the computer), Git.

1. **Create the local databases** (first time only). Open a terminal and sign in to MySQL as root
   (`mysql -u root -p`, with the root password you chose when installing MySQL), then run, choosing your own
   local password in place of `<local-password>`:

   ```
   CREATE DATABASE IF NOT EXISTS smart_green_hub_dev;
   CREATE DATABASE IF NOT EXISTS smart_green_hub_test;
   CREATE DATABASE IF NOT EXISTS smart_green_hub_e2e;
   CREATE USER IF NOT EXISTS 'sgh_local'@'localhost' IDENTIFIED BY '<local-password>';
   GRANT ALL ON smart_green_hub_dev.* TO 'sgh_local'@'localhost';
   GRANT ALL ON smart_green_hub_test.* TO 'sgh_local'@'localhost';
   GRANT ALL ON smart_green_hub_e2e.* TO 'sgh_local'@'localhost';
   ```

   Later: nothing to do, as long as the `MySQL80` service is running (Windows: *Services* app).

2. **Create the environment files** (none are committed; `backend/.env.example` lists every name):
   - `backend/.env`: real settings: the Aiven connection (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
     `DB_NAME=defaultdb`, `DB_CA_PATH=certs/aiven-ca.pem`), `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, email.
     Download Aiven's CA certificate into `backend/certs/aiven-ca.pem` (the `certs/` folder is never committed).
   - **Order matters:** the API loads `backend/.env.local` first and `.env` only fills what is missing, so while
     `.env.local` exists, `npm run dev` uses the LOCAL database. Without `.env.local`, `npm run dev` uses the live
     Aiven database (real data); then start it with `npm run dev -- --no-db`.
   - `backend/.env.local`: local overrides: `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_NAME=smart_green_hub_dev`,
     `DB_USER=sgh_local`, `DB_PASSWORD=` your local password from step 1, `DB_SSL=false`, `NODE_ENV=development`,
     `APP_URL=http://localhost:5173`, `CORS_ORIGIN=http://localhost:5173`. An empty line here never hides a value
     from `.env`.
   - `backend/.env.test`: only for `npm test`: the same local values with `DB_NAME=smart_green_hub_test`, a test
     `JWT_SECRET` and fake admin details. Tests refuse any remote host and `defaultdb`.
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
   - checks that the local MySQL answers (on `DB_HOST` / `DB_PORT` from `backend/.env.local`);
   - applies new database migrations;
   - starts the **API** (http://localhost:5000) and the **app** (http://localhost:5173) together, with `[api]`
     and `[app]` in front of their messages.

   Open http://localhost:5173. **Ctrl+C stops both.** If one of them crashes, the other is stopped too, so you never
   end up with half the app running. If the API or the app is already running in another terminal, the command
   says so and stops; close the other one first. Using a database that is not the local one:
   `npm run dev -- --no-db`.

   Other commands from the root folder: `npm run setup` (install all packages), `npm test` (backend and browser
   tests), `npm run lint`.

   You can still start each part on its own: `cd backend` then `npm run dev`, and `cd frontend` then `npm run dev`.

   When the API starts it creates, only if missing: the first administrator from `ADMIN_EMAIL` /
   `ADMIN_PASSWORD`, and the default risk rule. It **never creates plant species** or any other data. Without
   `BREVO_API_KEY`, emails (including the 6-digit codes) are printed in the API terminal instead of being sent.

4. **Database commands** (from `backend/`; migrations only ever add tables and columns):

   | Command | What it does |
   |---------|--------------|
   | `npm run migrate` | apply new migrations to the LOCAL database (refuses the live one) |
   | `npm run migrate:status` | which migrations ran on the LOCAL database (read-only) |
   | `npm run migrate:undo` | undo the last migration, LOCAL only (always refused on the live database) |
   | `npm run migrate:live` | **on purpose:** apply new migrations to the LIVE database (reads only `backend/.env`) |
   | `npm run migrate:live:status` | which migrations ran on the LIVE database (read-only) |

   Running `npx sequelize-cli ...` directly against the live database is refused too; always use these scripts.

5. **Demo data** (optional, for a presentation on a LOCAL database only):

   ```
   cd backend
   DEMO_PASSWORD=<choose a password> node scripts/seed-demo.js [--fill=<operator email>]
   ```

   It creates sample nurseries, institutions, batches, sales and hand-overs. Every demo name starts with
   **[DEMO]**. It needs some species in the local database first. It refuses the live database, with no
   override.

6. **Kigali starter species** (LOCAL database only: 35 plants commonly grown around Kigali, for trying the app):

   ```
   cd backend
   node scripts/seed-species.js --dry-run   # preview only
   node scripts/seed-species.js             # add the plants
   ```

   The day values are **estimates**. The script refuses the live database: on the live site the administrator
   adds the real species, with confirmed values, in *Rules & Species*.

## 11. Tests

| Command | What runs |
|---------|-----------|
| `cd backend && npm test` | Jest unit and API tests (risk rules, planting, sync, surplus, codes, email outbox, ...) on the LOCAL test database |
| `cd frontend && npm run test:e2e` | 34 Playwright tests in Microsoft Edge at phone and desktop size (starts its own API and app on the LOCAL e2e database) |
| `cd frontend && npm run lint` | ESLint |
| `cd backend && node scripts/load-test.js http://localhost:5000 50 10` | 50-user load test (NFR01), local API only |

The tests need the local MySQL (section 10). They **refuse** to run when the database is remote or `defaultdb`, and
they create their own `[TEST]` species in the local test databases only. The species-request flow is covered by
`backend/tests/api/speciesRequests.test.js`, `backend/tests/unit/speciesNames.test.js` and
`frontend/e2e/species-requests.spec.js`; Available plants by `backend/tests/api/availablePlants.test.js` and `frontend/e2e/available-plants.spec.js`; the Requests lists with both kinds of request (surplus offer and available plant) and their history by `backend/tests/api/requestLists.test.js`; the admin Sales page by `backend/tests/api/adminSales.test.js` and `backend/tests/unit/salesReport.test.js`; admin history (species requests, listings and plants) by `backend/tests/api/adminHistory.test.js`; archive, unarchive, delete rules and permissions by `backend/tests/api/adminRecords.test.js`; the homepage (consent, data exposure, disappearing batches, featured position, rate limit) by `backend/tests/api/homepage.test.js`, `backend/tests/unit/homepage.test.js` and `frontend/e2e/admin-homepage.spec.js`; help and support (permissions, public form limits, status flow, notifications, offline sending) by `backend/tests/api/support.test.js`, `backend/tests/unit/support.test.js` and `frontend/e2e/support.spec.js`. To run them safely, use the local MySQL (section 10) so that
`backend/.env.test` and `.env.e2e` point to `127.0.0.1` with `_test` / `_e2e` database names; never point them at
Aiven. Results, including Lighthouse scores,
are in `docs/TEST_REPORT.md`.

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

**Render (API service).** *Environment* tab of the service:

| Name | Value |
|------|-------|
| `NODE_ENV` | `production` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | the Aiven service's connection details |
| `DB_NAME` | `defaultdb` (the only database on Aiven's free plan) |
| `DB_CA_CERT` | the full text of Aiven's CA certificate, from `-----BEGIN CERTIFICATE-----` to `-----END CERTIFICATE-----` |
| `JWT_SECRET` | long random text |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | first administrator |
| `BREVO_API_KEY`, `MAIL_FROM` | email |
| `APP_URL`, `CORS_ORIGIN` | the address of the frontend (no trailing slash) |
| `TRUST_PROXY` | `2` |
| `OTP_SECRET` | optional |

Render sets `PORT` and `RENDER=true` itself. **Never set `DB_CA_PATH` on Render** (the file does not exist
there and the API would not start), nor `DB_SSL`, `ENV_FILE` or `EMAIL_OUTBOX_FILE`.

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

### On Render (API)

- **Render** (API): root directory `backend`, build command `npm install`, start command **`npm start`**.
  Auto-Deploy *On Commit* for branch `main`.
- **Vercel** (app only): a project with root directory `frontend`; `frontend/vercel.json` sends `/api/*` to Render.
- Free-plan note: Render sleeps when unused, so the first request can take up to about 50 seconds.

**What `npm start` does on every start, by itself (all steps are safe to repeat):**
1. `scripts/migrate.js up --deploy`: applies only migrations that have not run yet. On an empty `defaultdb`
   this creates all tables and the default risk rule; on an up-to-date database it changes nothing. It is
   allowed on the live database only because Render sets `RENDER=true`; the same command on your computer refuses.
2. `src/server.js` starts the API and then checks: the default risk rule exists (created only if missing,
   never overwritten), and an administrator exists (created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` only if there
   is none; the password is never printed). No species and no other data are created.

**Moving to a new, empty Aiven database:** update the `DB_` variables in *Environment* (and remove
`DB_CA_PATH` if it is there) → *Manual Deploy → Deploy latest commit* → open `/api/health` and check
`"database":"connected"` → sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` → add the real species in
*Rules & Species*.

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
- **Database up to date?** Live: `cd backend && npm run migrate:live:status`; local: `npm run migrate:status`
  (every line should say `up`).
- **"The server took too long to answer" and `/api/health` does not answer**: the free Aiven service is
  probably powered off after a period without use. Aiven console → the MySQL service → *Power on*, wait until
  it shows *Running*.
- **"No species yet" on Add batch / Planting plan**: expected on a new database. The administrator adds the
  species in *Rules & Species*, or a nursery proposes one with *My species is not listed*.
- **A batch shows "Waiting for species approval"**: its species was proposed by the nursery. The administrator
  decides it in *Species requests*; until then the batch has no dates and no alerts (by design).
- **Local database not reachable?** Start the `MySQL80` service (Windows: *Services* app) and check `DB_HOST` /
  `DB_PORT` in `backend/.env.local`.
- **`npm` says ENOENT / package.json not found**: you are in the wrong folder. Run `npm run dev` from the
  project root (`Smart-Green-Hub`).
- **"Port 5000 (or 5173) is already in use"**: the API or the app still runs in another terminal; stop it with
  Ctrl+C there, then run `npm run dev` again.
- **Nobody receives emails**: open Admin → *Email problems*. "Skipped" means no `BREVO_API_KEY` is loaded.
  "Failed" shows Brevo's answer: `HTTP 401` = wrong key; `HTTP 403 ... transactional.email` = the account may
  not send transactional email; `HTTP 400` about the sender = `MAIL_FROM` is not a verified sender.

## 15. Before the pilot, and future work

**Before a real pilot:**
- **Aiven is retiring its free MySQL plan:** on 21 December 2026 free MySQL services are powered off and their
  data and backups deleted. Upgrade the service to the Developer plan (USD 5 per month, always on; Aiven keeps
  the data and connection details) before entering real pilot data, or export the data in time.
- The administrator adds the real plant species with values from the needs assessment (Admin → Rules & Species).
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
