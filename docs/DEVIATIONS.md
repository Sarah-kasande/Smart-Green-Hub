# Deviations from the research proposal

This file lists every place where the implementation differs from, or adds detail to, the proposal
(ERD in Figures 3-5, Table 5 rules, workflows in Figures 8-12). Each item says what changed and why,
so the report can be updated. New items are added at the end of each phase.

## Phase 1: Foundation

### Database (ERD)

| # | Change | Where | Reason |
|---|--------|-------|--------|
| D1 | Added supporting table **AUTH_TOKENS** (user, purpose, SHA-256 token hash, expiry, used_at) | `auth_tokens` | Single-use, time-limited email-confirmation and password-reset links (FR02, FR17, NFR02). The proposal (3.4.2) says supporting authentication-token tables exist but are omitted from the diagrams. |
| D2 | Added supporting table **STOCK_ADJUSTMENTS** (batch, nursery, signed quantity change, reason, adjusted_by, adjusted_at, client_uuid) | `stock_adjustments` | FR04 requires a record of every stock adjustment with its reason, and FR13 lists stock adjustments as recordable offline, so they need their own client_uuid. |
| D3 | Added supporting table **UPLOADED_FILES** (owner, purpose, entity, name, MIME type, size, LONGBLOB data) | `uploaded_files` | Verification documents and batch photos (NFR03). Stored in MySQL because Render's disk is wiped on every deploy and no separate object storage is used in the pilot. Max 10 MB; Aiven `max_allowed_packet` = 64 MB (checked 16/10/2026), so a 10 MB file fits. |
| D4 | USERS: added `email_verified_at`, `token_version`, `updated_at`, `archived_at` | `users` | `email_verified_at`: email confirmation (FR02). `token_version`: increasing it signs the user out on every device after a password reset (FR17). |
| D5 | NURSERIES and INSTITUTIONS: added `review_note` | `nurseries`, `institutions` | Stores the administrator's reason when details are rejected, so the owner can correct and resubmit (Figure 8 "Correct details and resubmit"). The reason is also kept in AUDIT_LOGS. |
| D6 | SURPLUS_REQUESTS: added `decision_reason`, `nursery_confirmed_at`, `institution_confirmed_at` | `surplus_requests` | FR11: optional decision reason; stock is reduced only after **both** confirmations are set. |
| D7 | SURPLUS_LISTINGS: added `pickup_note` | `surplus_listings` | FR09 asks for a pickup note; the ERD did not show it. |
| D8 | RULE_SETTINGS: added `far_days` (28) and `near_days` (7); `prime_window_days` is nullable | `rule_settings` | Table 5 lists the day limits 28 and 7 as settings. `PLANT_SPECIES.default_prime_days` is the default prime window; a RULE_SETTINGS row for a species only overrides it (NULL = use the species value). |
| D9 | RISK_ALERTS: added `sales_rate` and `risk_ratio` | `risk_alerts` | Lets the operator see why a batch was flagged (proposal 2.2: rules must be transparent). |
| D10 | NOTIFICATIONS: added `read_at` and `last_error` | `notifications` | In-app "read" state, and failure visibility for the administrator (FR14). |
| D11 | `archived_at` (soft delete) on users, nurseries, institutions, species, batches, sales, expenses, listings, files | several | FR16: records are archived, never permanently deleted. Foreign keys use ON DELETE RESTRICT. |
| D12 | Money (unit_price, amount, discounted_price) stored as whole Rwandan francs (INTEGER) | several | RWF has no smaller unit in practical use; avoids rounding issues. |
| D13 | `created_at` / `updated_at` on every table | all | Standard timestamps, mentioned in 3.4.2 as omitted from the diagrams. |

### Formulas and rules (to be applied in Phase 3)

| # | Decision | Reason |
|---|----------|--------|
| F1 | Sales rate r is calculated **per nursery and per species** (units of that species sold by that nursery in the last L days, divided by L). | Agreed interpretation of Table 5 / Figure 9 ("sales of the species"). |
| F2 | **Limitation:** when a nursery has two or more active batches of the same species, each batch is evaluated with the same r, so the same expected sales are counted for each batch. This can under-estimate the risk. | Kept to match the proposal's formula exactly; noted for the report and the back-test. |
| F3 | Planting recommendation: growing-cycle months = `default_days_to_ready / 30`; pipeline stock = current stock in batches at the seedling, growing and ready stages. | Table 5 does not define these two inputs precisely. |
| F4 | "Not enough sales history" = fewer than 90 days since the nursery's first sale of that species, **or** zero sales of it in the last 3 months. The screen then shows "not enough sales history" instead of a number (`recommended_qty` = NULL). | FR08 requires a message instead of a number, but no threshold was defined. |
| F5 | Available stock for a sale or a new listing = `quantity_current` minus the quantity in that batch's **active** listings. | Prevents the same plants being sold and offered at the same time (3.4.2: a batch can never be offered in a larger quantity than it holds). |
| F6 | When a listing expires, its pending and approved requests become `cancelled` and the reserved quantity is released. | FR11 mentions "expired" requests, but the request statuses (ERD) have no "expired" value. |

### Workflows and features

| # | Change | Reason |
|---|--------|--------|
| W1 | Email is sent through the **Brevo HTTP API** (not SMTP/Nodemailer). | Render's free plan blocks outgoing SMTP ports. In development, emails are printed to the console. |
| W2 | Login session = JWT in an **HttpOnly, SameSite=Lax cookie**, with double-submit **CSRF** tokens. The frontend calls `/api` on its own domain; Vercel rewrites `/api/*` to Render, so the cookie is first-party. | NFR02 (HttpOnly cookies, CSRF) with JWT as in the stack; avoids third-party-cookie blocking in Safari and other browsers. |
| W3 | Login is refused until the email is confirmed; an operator or institution can sign in while "pending" but cannot publish or request until approved. | FR02 + Figure 8. |
| W4 | The first administrator is created automatically at server start from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, only if no administrator exists (also available as `npm run seed:admin`). | FR02 "controlled provisioning"; Render's shell is not available on the plan used. |
| W5 | Species seed rows are **DEMO placeholders** ("[DEMO - confirm in needs assessment]", 180 days to ready, 60 prime days, no Kinyarwanda name). Inserted only when the species table is empty. | No invented research data; to be replaced after the needs assessment. |
| W6 | One nursery per operator in the user interface (the database allows several). | Simpler for the pilot; ERD kept flexible. |
| W7 | Districts are limited to the three districts of the City of Kigali (Gasabo, Kicukiro, Nyarugenge); sector is free text. | Project scope is Kigali (1.5). |
| W8 | Left out of the Figma design on purpose: the "Coordinated with REMA" claim, report-download buttons, surplus/risk information in the public directory, the "Seasonal demand multiplier" toggle and the "Download field summary (PDF/CSV)" button. Public statistics will come from real impact records only. | Not in the proposal, or would be unverified claims (decided before Phase 1). |
| W9 | Uploads are sent as the raw request body (file type in Content-Type, name in X-File-Name) instead of multipart forms. The server checks the real type from the file's first bytes. | No extra upload library needed; NFR03 signature check. |

## Phases 2-7: Operator core, risk engine, redirect, admin, notifications, testing

### Database

| # | Change | Where | Reason |
|---|--------|-------|--------|
| D14 | SURPLUS_REQUESTS: added `planting_site`, `planting_district`, `land_cleared_sqm` (migration `20261020000001`) | `surplus_requests` | Each party gives its part of the hand-over details when it confirms (institution: planting site; nursery: land cleared). They are copied into IMPACT_RECORDS only when BOTH have confirmed (FR11, FR12). |

### Rules and calculations

| # | Decision | Reason |
|---|----------|--------|
| F7 | Profit or loss is shown for the whole nursery and per period; species and batches show **income** (units and RWF). | Expenses are recorded by category (FR05), not per batch, so they cannot be split fairly across species or batches. |
| F8 | One open alert per batch: a nightly run refreshes the existing open or acknowledged alert instead of creating a new one. After the operator **dismisses** an alert, the same batch is not alerted again at the same or a lower level for 7 days (a higher level still creates an alert). | FR07 says "one open alert"; without a quiet period a dismissed alert would come back every night. |
| F9 | `projected_unsold` is rounded **up** to whole plants; the risk ratio uses the exact value. | Plants are whole units; rounding up never hides a remaining fraction. |
| F10 | When the last plants of a batch are handed over (stock reaches 0), the batch is set to `cleared` automatically and this is written to the audit log. Apart from this, the system never changes a batch, price or listing by itself (stages are only *suggested* from the dates). | Figure 10 shows "clear batch when stock is zero"; FR07 forbids other automatic changes. |
| F11 | A listing's status follows its quantities: `active` while plants can be requested, `reserved` when everything left is reserved, `fulfilled` when everything was handed over. | Listing lifecycle (ERD) with reservations from FR10. |

### Workflows and features

| # | Change | Reason |
|---|--------|--------|
| W10 | **Web push is not implemented** (future work). Notifications are in-app and by email (FR14). | It needs an extra library, VAPID keys, a subscriptions table and a custom service worker; time was used for testing the core flows instead (agreed: drop if time is short). |
| W11 | The unique (listing, institution) pair is kept. If an institution's request was declined or cancelled, a new request for the same listing **reopens** that row instead of creating a second one. A fulfilled request cannot be repeated. | FR10 plus the ERD unique constraint. |
| W12 | Nursery contact details (name, phone) are shown to an institution only after the operator **approves** its request; the operator always sees the institution's contact. | Proposal 3.2.3: separate consent for sharing contact details. |
| W13 | When a listing expires, its approved requests are cancelled as well, even if one side had already confirmed. | F6; keeps reservations from blocking stock. Operators should confirm hand-overs before the listing ends. |
| W14 | Offline changes sent to `/api/operator/sync` are validated with the same rules as the online forms; invalid ones come back as conflicts (`VALIDATION_FAILED`). | Security review (Phase 7). |
| W15 | Notification emails are sent from the outbox right after the action and every 5 minutes (retries up to 5 attempts); failed emails are listed for the administrator ("Email problems"). | FR14 outbox with retries and visible failures. |
| W16 | The nightly job runs inside the API at 02:00 Kigali time. On Render's free plan the API sleeps when unused, so the job only runs if the API is awake. Operators can use **Check now** and the administrator **Run nightly check now**. | Hosting limitation. Option: a free uptime ping (e.g. cron-job.org) to `/api/health` a few minutes before 02:00. |
| W17 | **Dark mode** (Light / Dark / Same as device) in Settings, saved on the device. | Requested by the project owner; not in the proposal or the Figma design. |
| W18 | A general API rate limit (600 requests per 5 minutes per IP) was added on top of the login, reset, registration and upload limits. | Security review (Phase 7). |
| W19 | Pages are loaded on demand and the map library only when a map is shown. | NFR01: smaller first download on phones (landing page LCP 2.6 s in Lighthouse, mobile profile). |

## Email delivery and one-time codes (October 2026)

| # | Change | Reason |
|---|--------|--------|
| W20 | **Every email goes through the NOTIFICATIONS outbox** (confirmation codes, password-reset codes, password-changed notices and all notifications) with a truthful status: `queued`, `sent`, `failed` (Brevo refused or could not be reached; Brevo's HTTP status, code and message are stored) or `skipped` (development or tests without a Brevo key: printed to the console, never counted as delivered). New columns `recipient_email` and `in_app` (code emails are not shown in the in-app list); `pending` renamed `queued` (migration `20261021000001`). Admin → Email problems shows sent / failed / skipped counts and every failed or skipped email (time, type, masked recipient, attempts, exact error) with a Retry button. `/api/health` reports `email: configured / not configured`; a production start without a key logs a clear error. | FR14 asks for an outbox with retry status and visible failures for *every* event; before, registration and reset emails bypassed the outbox and printed emails were counted as "sent", which hid a delivery problem. |
| W21 | **Email confirmation (FR02) and password reset (FR17) use a 6-digit one-time code instead of a single-use link.** Code from `crypto.randomInt`, valid 10 minutes, single use; only an HMAC-SHA256 (key `OTP_SECRET`, or `JWT_SECRET` if not set) bound to user and purpose is stored and compared in constant time; 5 wrong tries invalidate the code; a new code invalidates the previous one; at most one code per 60 s and 10 per 24 h per account, plus per-IP limits on sending (5 / 15 min) and checking (20 / 15 min). The reset request still answers neutrally; a successful reset still ends all sessions (token_version). `auth_tokens.token_hash` is no longer unique (two users may get the same code) and has an `attempts` column. | The proposal said "single-use link". Codes work better on phones (no switching between the mail app and the browser, no long links broken by mail clients) and keep the same protections: single use, short validity, hashed storage, limited tries. |
| W22 | A failed code email cannot be resent unchanged, because the code itself is never stored. "Retry" on such an email issues a **new** code (the old one stops working). Notification emails are simply sent again. | Security: codes are never kept in readable form. |
| W24 | A correct email-confirmation code **signs the person in** and opens their home page, which shows the next step (an administrator checks the account). An unconfirmed sign-in (right password) goes straight to the code screen, where a new code can be requested; this answer is only given after a correct password, so it does not help to guess accounts. | The code proves control of the address registered a moment earlier with a password; asking for the password again would only add a step. |
| W25 | The app reloads itself once when a new version is deployed (the new service worker takes over) and open tabs check for a new version every hour. | Without this, a browser could keep showing cached old screens after a deploy (the old "check your email / link" page was still shown after the switch to codes). |
| W23 | `MAIL_FROM` is read in the forms `Name <address>`, `address`, `Name, address` and `Name address`. | A sender written as `name, address` was passed to Brevo as the address. |
