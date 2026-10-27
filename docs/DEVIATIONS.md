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
| W25 | *(Replaced by W28.)* The app reloaded itself as soon as a new version was deployed. | Without this, a browser could keep showing cached old screens after a deploy. |
| W23 | `MAIL_FROM` is read in the forms `Name <address>`, `address`, `Name, address` and `Name address`. | A sender written as `name, address` was passed to Brevo as the address. |

## Signed-in layout and version handling (October 2026, supervisor review)

| # | Change | Reason |
|---|--------|--------|
| W26 | **New layout for all signed-in pages** (admin, operator, institution), following a reference admin tool chosen by the supervisor; the Figma screens remain the reference for colours and components. Top bar: logo and name on the left; sync chip, notification bell, EN / Kinyarwanda and a user menu (profile and settings, sign out) on the right. Sidebar: short UPPERCASE groups with text-only links (admin: Review / Manage / Settings; operator: Work / Insight / Share / Settings; institution: Find plants / Insight / Settings); "Sales" and "Expenses" are two menu items for the two tabs of the Sales & Expenses page. Pages: title on the left, a count on the right, one toolbar (search, status dropdown, Table / Cards switch), tables with UPPERCASE headings and one clear empty row, a FILTER panel on screens of 1280 px and wider. Phones: bottom bar (4 pages + Menu) and a menu drawer with the same groups; tables become cards. Decorative icons and introduction sentences were removed; icons are kept only where they carry meaning (status and risk badges, sync chip, bell, message boxes, bottom bar). **No colour value was changed** (same tokens, light and dark). The public landing page keeps its design (changed later, see W29). | Supervisor feedback: a quieter, more familiar admin layout with fewer icons and words. The design rules of CLAUDE.md still hold: 48 px touch targets, a word next to every status colour, language switch reachable on every screen. |
| W27 | Small page changes to fit the pattern: the Verification queue is a table; "Open" shows the details and decision buttons **below** the table (before: list left, details right). Adding or editing a species opens the form above the species table (before: inside the list). Batch, listing, alert and request status filters use a dropdown (and the filter panel) instead of a row of buttons. The search boxes filter the rows already loaded in the browser (no new API calls). Some table columns were combined (e.g. offer type under the plant name). No behaviour, API call, data or permission changed. | Tables need the details outside the rows; the dropdown is the same control on every page and on phones. |
| W28 | **The version-mismatch banner was removed.** The API version is shown only in `/api/health` and in the server log at startup; in development the browser console notes a difference. New versions reach people silently: the service worker downloads in the background and the new version is switched on at the **next page change inside the app** (no prompt, no reload while someone is typing). The service worker still never caches `/api` answers (NFR04). Pages tolerate an older or newer API: missing fields count as 0, an unknown route or failed request shows "Try again", and a page that cannot be drawn shows "This page could not be shown. Please try again." instead of a blank screen. | Supervisor: users and administrators should not see technical deploy messages. The cause (Render and Vercel deployed from different commits) is avoided by deployment settings (README, "Keeping Render and Vercel on the same commit"). |

## UI redesign with shadcn/ui and Magic UI (October 2026, approved by the supervisor)

| # | Change | Reason |
|---|--------|--------|
| W29 | **New look for the whole app**, inspired by modern agriculture websites (layout ideas only; no images, names or texts were copied). New public landing page: floating glass menu bar, large heading, full-width photo, a band of impact numbers (only real figures from confirmed hand-overs), the four jobs as photo tiles, "How it works", the nursery directory and a green call-to-action band; a new footer with photo credits. Sign-in and code pages show a photo panel beside the form on wide screens. **The colour palette is unchanged** (shadcn/ui colour names are mapped onto the CLAUDE.md tokens). | Supervisor approved the redesign of the whole application, including the landing page (earlier, W26 kept it). |
| W30 | **Component libraries: shadcn/ui** (dialogs, bottom sheets, side sheet, dropdown menu, Ctrl+K search, tabs, toggle groups, table, input, textarea, label, badge, avatar, progress, skeleton, toasts, charts on Recharts) and **Magic UI** (shimmer button, marquee). New packages: `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, `vaul`, `sonner`, `recharts`, `tw-animate-css`. The components are copied into `frontend/src/components/shadcn/` (our own code, no lock-in). | Approved by the project owner (UI.md, D1). |
| W31 | **Font: Manrope** (variable, self-hosted, SIL Open Font License, `src/assets/fonts/`), only the Latin files (English and Kinyarwanda need nothing else). **Photos** from Wikimedia Commons under free licences (CC0, CC BY 4.0, CC BY-SA 4.0), compressed to WebP in 3-4 sizes so phones download the small one; credits in the footer and in `src/content/photos.js`. Photos with identifiable children were not used. | UI.md D4 and D5; licences require attribution for CC BY / CC BY-SA. |
| W32 | **Dashboards**: nursery (greeting, 4 key numbers with count-up and a 6-month sales trend, "Act now" card for the batch most at risk, batches by risk, prime-window timeline, requests waiting, income vs expenses chart, planting suggestions); institution (request tracker with steps Requested -> Approved -> Handed over -> Received, plants available in its district with a map, plants received per month); administrator ("Needs your attention", impact chart). All numbers come from the existing API. | UI.md 5.4-5.6. |
| W33 | Browser pop-ups (`window.prompt`, `confirm`, `alert`) were replaced by app dialogs (bottom sheets on phones) for: withdraw listing, archive batch or species, undo sale/expense, cancel request, sign out with unsent changes. "Request plants" opens in a dialog / bottom sheet. Settings are split into tabs (Profile, Appearance, Organisation). Requests show the same progress steps. Batch cards show a prime-window progress bar. Ctrl+K search jumps to any page or quick action. "Install app" in the user menu (iPhone: Share -> Add to Home Screen hint). Manifest shortcuts (Add batch, Record sale, Surplus Board). | UI.md 5.3, 5.7, 6. |
| W34 | **Differences from UI.md, for speed on low-end phones:** Magic UI *Number Ticker*, *Blur Fade*, *Border Beam*, *Dot Pattern* and *Bento Grid* were replaced by small own versions with the same look (CSS animation / plain SVG), so the `motion` animation library is not needed; the risk donut is plain SVG (the chart library loads only for the income/impact charts, when they come near the screen); the lower part of the landing page and dashboards is built just after the first screen; toasts are loaded only after signing in. The one-time code stays one accessible field (no 6-box *Input OTP*: pasting "123 456" and screen readers work better). Filters stay as dropdowns in the toolbar on phones (no filter drawer). Dropdowns stay native `<select>` (better on phones and with screen readers). | Lighthouse showed the first versions much slower on a simulated low-end phone (landing performance 51). NFR01 and accessibility come before decoration. |

