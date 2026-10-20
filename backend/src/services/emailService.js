// Sends ONE email through Brevo's transactional HTTP API and reports exactly what happened.
// (Render's free plan blocks outgoing SMTP ports, so SMTP/Nodemailer cannot be used in production.)
// Every email is recorded in the outbox by notificationService.js, which calls this function.
//
// Result: { status, error }
//   sent     Brevo accepted the email
//   failed   Brevo refused it, could not be reached, or (production) no key is set.
//            error = Brevo's HTTP status, code and message, e.g. "Brevo HTTP 403 permission_denied: ..."
//   skipped  development or tests without BREVO_API_KEY: the email is printed to the console
//            (development) or kept in memory (tests) instead of being sent. Never reported as delivered.
const fs = require('fs');
const { isProduction, isTest } = require('../config/env');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// Emails captured during tests (when no key is set)
const sentEmails = [];

// User-typed text (names, reasons) goes into the HTML email, so escape it.
function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const EMAIL_PATTERN = /[^\s<>,;"']+@[^\s<>,;"']+\.[^\s<>,;"']+/;

// Reads MAIL_FROM in any of these forms and returns { name, email }, or null if no address is found:
//   "Smart Green Hub <hi@x.rw>"   "hi@x.rw"   "Smart Green Hub, hi@x.rw"   "Smart Green Hub hi@x.rw"
function parseSender(value) {
  const text = String(value || '').trim();
  const match = text.match(EMAIL_PATTERN);
  if (!match) return null;
  const name = text.replace(match[0], '').replace(/[<>"',;]/g, ' ').replace(/\s+/g, ' ').trim();
  return { name: name || 'Smart Green Hub', email: match[0] };
}

// Is email set up? Never returns secret values.
function emailConfig() {
  const hasKey = Boolean(process.env.BREVO_API_KEY);
  const sender = parseSender(process.env.MAIL_FROM);
  let problem = null;
  if (!hasKey) problem = 'BREVO_API_KEY is not set';
  else if (!sender) problem = 'MAIL_FROM has no valid email address';
  return { configured: !problem, problem };
}

// "isabelle@gmail.com" -> "i***@gmail.com" (for logs and the admin page)
function maskEmail(email) {
  const [user, domain] = String(email || '').split('@');
  if (!domain) return '***';
  return `${user.slice(0, 1)}***@${domain}`;
}

// Development only: show an email that was not sent in the server console, so codes can still be
// tested locally. Never in production (codes must not end up in server logs).
function printForDevelopment({ to, subject, text }, reason) {
  if (isProduction || isTest) return;
  console.log(`
----- EMAIL NOT SENT (${reason}) -----
To: ${to}
Subject: ${subject}

${text}
-----------------------------------------
`);
}

async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    if (isTest) {
      sentEmails.push({ to, subject, text });
      return { status: 'skipped', error: 'BREVO_API_KEY is not set (test: email captured in memory)' };
    }
    if (!isProduction) {
      // End-to-end tests read the emails from a file
      if (process.env.EMAIL_OUTBOX_FILE) {
        fs.appendFileSync(process.env.EMAIL_OUTBOX_FILE, `${JSON.stringify({ to, subject, text, at: new Date().toISOString() })}\n`);
      } else {
        console.log(`\n----- EMAIL NOT SENT (development, no BREVO_API_KEY) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n----------------------------------------------------------\n`);
      }
      return { status: 'skipped', error: 'BREVO_API_KEY is not set (development: printed to the server console)' };
    }
    console.error(`Email to ${maskEmail(to)} NOT sent: BREVO_API_KEY is not set`);
    return { status: 'failed', error: 'BREVO_API_KEY is not set' };
  }

  const sender = parseSender(process.env.MAIL_FROM);
  if (!sender) {
    console.error(`Email to ${maskEmail(to)} NOT sent: MAIL_FROM has no valid email address`);
    printForDevelopment({ to, subject, text }, 'MAIL_FROM has no valid email address');
    return { status: 'failed', error: 'MAIL_FROM has no valid email address' };
  }

  let response;
  try {
    response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html || `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    const message = `Could not reach Brevo: ${error.message}`;
    console.error(`Email to ${maskEmail(to)} NOT sent: ${message}`);
    printForDevelopment({ to, subject, text }, 'Brevo could not be reached');
    return { status: 'failed', error: message };
  }

  if (!response.ok) {
    // Brevo explains the refusal in JSON: { code, message }. The API key is never logged.
    const body = await response.json().catch(() => ({}));
    const message = `Brevo HTTP ${response.status}${body.code ? ` ${body.code}` : ''}: ${body.message || response.statusText}`;
    console.error(`Email to ${maskEmail(to)} NOT sent: ${message}`);
    printForDevelopment({ to, subject, text }, `Brevo refused: ${message}`);
    return { status: 'failed', error: message.slice(0, 500) };
  }
  return { status: 'sent', error: null };
}

module.exports = { sendEmail, sentEmails, parseSender, emailConfig, maskEmail, escapeHtml };
