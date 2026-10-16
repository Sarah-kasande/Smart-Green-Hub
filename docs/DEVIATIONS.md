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
