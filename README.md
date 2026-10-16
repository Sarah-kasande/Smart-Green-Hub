# Smart Green Hub

A Progressive Web App for flower and tree nurseries in Kigali: predict surplus (rule-based),
redirect surplus plants to institutions, plan planting and measure impact. ALU capstone project.

- `frontend/`: React + Vite + Tailwind CSS v4 PWA (deployed on Vercel)
- `backend/`: Node.js + Express + Sequelize API (deployed on Render, database on Aiven MySQL)
- `docs/`: research proposal and `DEVIATIONS.md` (differences from the proposal)
- `design/`: Figma exports

A full README (deployment, test report) is written in Phase 7. This section covers local development.

## Local development

Local development and tests use a **local MySQL 8.4** in Docker, never the production database.

1. Start the database (first time):

   ```
   docker run -d --name sgh-mysql --restart unless-stopped -p 3307:3306 -v sgh-mysql-data:/var/lib/mysql ^
     -e MYSQL_ROOT_PASSWORD=local_root_only -e MYSQL_DATABASE=smart_green_hub_dev ^
     -e MYSQL_USER=sgh_local -e MYSQL_PASSWORD=sgh_local_pw mysql:8.4 --max-allowed-packet=67108864
   docker exec sgh-mysql mysql -uroot -plocal_root_only -e "CREATE DATABASE IF NOT EXISTS smart_green_hub_test; GRANT ALL ON smart_green_hub_test.* TO 'sgh_local'@'%';"
   ```

   Later: `docker start sgh-mysql`.

2. Backend environment files (none of them are committed):
   - `backend/.env`: your real settings (Aiven, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, ...)
   - `backend/.env.local`: overrides `DB_*` to point at the local MySQL (`DB_HOST=127.0.0.1`, `DB_PORT=3307`,
     `DB_NAME=smart_green_hub_dev`, `DB_USER=sgh_local`, `DB_PASSWORD=sgh_local_pw`, `DB_SSL=false`) plus
     `NODE_ENV=development`, `APP_URL=http://localhost:5173`, empty `BREVO_API_KEY`. Delete it to use `.env` alone.
   - `backend/.env.test`: used only by `npm test` (local `smart_green_hub_test` database, fake accounts).
     The tests stop immediately if `DB_HOST` contains `aivencloud.com`.
   - See `backend/.env.example` for every variable name.

3. Run:

   ```
   cd backend
   npm install
   npm run migrate
   npm run dev          # API on http://localhost:5000 (creates the admin from ADMIN_EMAIL/ADMIN_PASSWORD if none exists)

   cd frontend
   npm install
   npm run dev          # app on http://localhost:5173 (Vite forwards /api to the API)
   ```

   Without `BREVO_API_KEY`, emails (confirmation and reset links) are printed in the API terminal.

4. Tests: `cd backend && npm test`

## Scripts (backend)

| Command | What it does |
|---------|--------------|
| `npm start` | Runs migrations, then starts the API (used by Render) |
| `npm run dev` | Starts the API with auto-reload |
| `npm run migrate` / `npm run migrate:undo` | Apply / undo database migrations |
| `npm run seed:admin` | Creates the first administrator if none exists |
| `npm test` | Jest + Supertest tests on the local test database |
