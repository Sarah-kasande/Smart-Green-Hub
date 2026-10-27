// Entry point of the API on Vercel (see "entrypoint" in the root vercel.json).
// On Vercel the API runs as a function: there is no long-running server, so server.js
// (app.listen + node-cron) is not used. Instead:
//   - the startup check (first administrator, DEMO species) runs once per new instance,
//     before its first request is answered;
//   - the nightly job is called by Vercel Cron at /api/cron/nightly (src/routes/cron.routes.js).
// Locally (npm run dev) and on Render, server.js is still the entry point.
require('./config/env');
const express = require('express');
const app = require('./app');
const { runBootstrap } = require('./services/bootstrapService');

let startup = null;

const server = express();
server.use(async (req, res, next) => {
  if (!startup) {
    startup = runBootstrap().catch((e) => {
      console.error('Startup data check FAILED:', e.message);
      startup = null; // try again on the next request
    });
  }
  await startup;
  next();
});
server.use(app);

module.exports = server;
