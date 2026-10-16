# Smart Green Hub: project instructions for Claude

ALU capstone project (BSc Software Engineering). A full-stack Progressive Web App for flower and tree
nurseries in Kigali, Rwanda. It is a decision-support and surplus-prevention system.
It is NOT an online shop. Never build a cart, checkout, payments, retail product search or delivery tracking.

The four jobs of the system:
1. PREDICT: rule-based surplus-risk alerts (no machine learning)
2. REDIRECT: Surplus Board matching mature plants to schools, sector offices, churches, hotels and community greening groups
3. PLAN: planting recommendations
4. MEASURE: impact dashboard

## Read first
- docs/: the research proposal PDF (requirements FR01-FR18, NFR01-NFR06, 15-entity ERD, risk rules, workflows)
- design/: Figma screens. Follow their layouts, colours and components.

## Git rules (IMPORTANT)
- NEVER run git add, git commit, git push, git merge, git rebase, git reset or any command that changes git history or the remote.
- You may run read-only git commands (git status, git diff, git log) if useful.
- When a piece of work is finished and tested, give me the exact commands to run myself, in this format:
  git add .
  git commit -m "clear message"
  git push
- Tell me which files changed and what I should check in the browser after pushing.

## Stack
- frontend/: React + Vite + Tailwind CSS v4 (plugin @tailwindcss/vite), PWA with vite-plugin-pwa (Workbox),
  IndexedDB with Dexie, React Router, Axios, Leaflet + OpenStreetMap. Deployed on Vercel.
  Vite config must keep: css: { postcss: { plugins: [] } } (blocks stray PostCSS configs outside the project).
  frontend/src/index.css contains: @import "tailwindcss";
- backend/: Node.js + Express REST API, Sequelize + MySQL (Aiven, SSL), JWT auth, bcryptjs, helmet, cors,
  morgan, node-cron (nightly risk job), Nodemailer (email). Deployed on Render.
- Tests: Jest, Supertest, Playwright, Lighthouse.
- Languages: English and Kinyarwanda (i18n locale files).

## Current state (working, do not break)
- Backend live: https://smart-green-hub.onrender.com (health check: /api/health must return database: connected)
- Frontend live on Vercel, reading VITE_API_URL
- Database: Aiven MySQL. backend/src/db.js exports the Sequelize instance (module.exports = sequelize) and loads the
  CA certificate from DB_CA_CERT (certificate text) or DB_CA_PATH (file path, local only).
- Environment variables (never commit values): PORT, DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_CA_CERT,
  DB_CA_PATH, JWT_SECRET, CORS_ORIGIN, VITE_API_URL. Keep backend/.env.example updated with names only.
- If you add a new environment variable, tell me exactly what to add in Render or Vercel.

## Roles
nursery operator, receiving institution, administrator, public visitor (directory and aggregate impact only).

## Core rules (rule-based, no ML)
Default values (editable by the administrator in RULE_SETTINGS):
- Lookback L = 28 days
- Sales rate r = units sold in L / L
- Days left D = prime-window end date - today (0 if already passed)
- Projected unsold U = max(0, S - r x D), where S = current stock of the batch
- Risk ratio R = U / S
- High if (D = 0 and S > 0) or R >= 0.50; Medium if 0.20 <= R < 0.50; otherwise Low
- Suggested action: D > 28: reduce next planting or discount; D 8-28: discount or transplant;
  D <= 7 or overgrown: post to Surplus Board or donate
- Planting recommendation = average monthly units sold (last 3 months) x growing-cycle months x (1 + 0.10 safety margin)
  - pipeline stock, minimum 0

## Statuses
- Batch stage: seedling, growing, ready, overgrown, cleared
- Alert: open, acknowledged, resolved, dismissed
- Listing: active, reserved, fulfilled, expired, withdrawn
- Request: pending, approved, fulfilled, declined, cancelled
- Stock is reduced permanently only after BOTH parties confirm the hand-over.
- Reservations run in database transactions. Unique (listing, institution) request.

## Offline-first
- Recording of batches, sales and expenses works offline (IndexedDB) and syncs later.
- Each record has a client_uuid for idempotent sync. Show a sync status chip: Online / Offline / N waiting to sync.

## Entities (15)
USERS, INSTITUTIONS, NURSERIES, PLANT_SPECIES, BATCHES, SALES, EXPENSES, RISK_ALERTS, SURPLUS_LISTINGS,
SURPLUS_REQUESTS, IMPACT_RECORDS, RULE_SETTINGS, PLANTING_RECOMMENDATIONS, NOTIFICATIONS, AUDIT_LOGS.

## Design
- Mobile-first at 390 px, desktop variants at 1440 px. Large touch targets (min 48 px), icon plus text label.
- Colours: ink #1B3350, green #2E7D32 (light #E4F2DC), teal #1F8A7A (light #DDF1EE), background #F5F6F8,
  info blue #EBF3FA. Risk: Low green, Medium amber #FEF2D4, High red/pink #FBE8E6. Always show the word
  Low / Medium / High with an icon, never colour alone.
- Language switch EN | Kinyarwanda on every screen. Mark uncertain Kinyarwanda translations with a TODO for review.

## Working rules
- Build ONE phase or feature at a time. Run the app locally and test before saying it is done.
- Keep code simple and readable. I am a student and must be able to explain every part. Comment non-obvious logic
  (risk engine, sync).
- Never commit .env files, certificates with secrets, passwords or tokens.
- Do not add features outside the proposal. Payments, ML, photo-based growth detection and SMS/USSD are future work only.
- Do not invent data. Use clearly labelled seed or demo data only.
- Ask me before installing a large dependency that is not listed above.
- If the proposal and the design disagree, ask me instead of guessing.
- Admin account: the seed script creates the first administrator from the environment variables ADMIN_EMAIL and ADMIN_PASSWORD.
  NEVER write the real password or email into code, seed files, tests, docs or commits. Tests use their own fake test accounts.
  Passwords are hashed with bcrypt. Do not log passwords or tokens.