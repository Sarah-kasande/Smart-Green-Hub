// Sends email through Brevo's transactional HTTP API.
// (Render's free plan blocks outgoing SMTP ports, so Nodemailer/SMTP cannot be used in production.)
//
// Without BREVO_API_KEY:
//   - development: the email is printed to the console so you can click the link locally
//   - test: the email is kept in memory (sentEmails) so tests can read the link
//   - production: nothing is sent and an error is logged WITHOUT the email content
const { isProduction, isTest } = require('../config/env');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// Emails captured during tests
const sentEmails = [];

// User-typed text (names, reasons) goes into the HTML email, so escape it.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// "Smart Green Hub <no-reply@x.rw>" -> { name: 'Smart Green Hub', email: 'no-reply@x.rw' }
function parseSender(value) {
  const text = (value || '').trim();
  const match = text.match(/^(.*)<([^>]+)>$/);
  if (match) return { name: match[1].trim() || 'Smart Green Hub', email: match[2].trim() };
  return { name: 'Smart Green Hub', email: text };
}

async function sendEmail({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    if (isTest) {
      sentEmails.push({ to, subject, text });
      return { delivered: false, captured: true };
    }
    // End-to-end tests read the emails from a file (never used in production)
    if (!isProduction && process.env.EMAIL_OUTBOX_FILE) {
      require('fs').appendFileSync(process.env.EMAIL_OUTBOX_FILE, `${JSON.stringify({ to, subject, text, at: new Date().toISOString() })}\n`);
      return { delivered: false, printed: true };
    }
    if (!isProduction) {
      console.log(`\n----- EMAIL (development, not sent) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-----------------------------------------\n`);
      return { delivered: false, printed: true };
    }
    console.error('Email not sent: BREVO_API_KEY is not set.');
    return { delivered: false };
  }

  let response;
  try {
    response = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: parseSender(process.env.MAIL_FROM),
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html || `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`,
      }),
    });
  } catch (error) {
    // A failed email must not break the action that triggered it (e.g. registration).
    console.error(`Email not sent: could not reach Brevo (${error.message})`);
    return { delivered: false };
  }

  if (!response.ok) {
    // Log only the status: the response could echo the recipient, and the body holds the link.
    console.error(`Email not sent: Brevo answered with status ${response.status}`);
    return { delivered: false };
  }
  return { delivered: true };
}

module.exports = { sendEmail, sentEmails, parseSender };
