// The Express application. Kept separate from server.js so tests (Supertest) can use it
// without starting a real server.
require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const sequelize = require('./db');
const { isTest } = require('./config/env');
const { issueCsrfCookie, verifyCsrf } = require('./middleware/csrf');
const { loadUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Number of proxies in front of the API (Vercel rewrite + Render), so req.ip is the real
// visitor address for rate limiting. 0 locally.
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));

app.use(helmet());
if (!isTest) app.use(morgan('tiny'));
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
  })
);
app.use(cookieParser());

// Health check (used by Render and by us). Must keep answering { database: 'connected' }.
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', database: e.message });
  }
});

// JSON bodies up to 100 KB. File uploads use their own raw parser (see uploads.routes.js).
app.use('/api', express.json({ limit: '100kb' }));
app.use('/api', issueCsrfCookie, verifyCsrf, loadUser, routes);

app.use('/api', notFound);
app.use(errorHandler);

module.exports = app;
