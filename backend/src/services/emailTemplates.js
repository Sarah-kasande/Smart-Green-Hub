// Email texts in English and Kinyarwanda. Each email uses the user's preferred language (FR18).
// TODO(translation review): all Kinyarwanda texts below need review by a native speaker.

const appUrl = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

// HTML version of a code email: the 6-digit code large and spaced, easy to read and copy.
// (Texts are fixed or come from our own templates; the user's name is escaped.)
function codeHtml({ greeting, intro, code, validity, ignore }) {
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div style="font-family:Segoe UI,Arial,sans-serif;color:#1B3350;max-width:480px">
<p>${esc(greeting)}</p>
<p>${esc(intro)}</p>
<p style="font-size:34px;font-weight:700;letter-spacing:10px;background:#E4F2DC;color:#1F5E23;padding:14px 18px;border-radius:12px;display:inline-block;margin:8px 0">${esc(code)}</p>
<p>${esc(validity)}</p>
<p style="color:#4A5D75">${esc(ignore)}</p>
<p style="color:#4A5D75">Smart Green Hub</p>
</div>`;
}

function codeEmail(subject, parts) {
  return {
    subject,
    text: `${parts.greeting}\n\n${parts.intro}\n\n    ${parts.code}\n\n${parts.validity}\n${parts.ignore}`,
    html: codeHtml(parts),
  };
}

const templates = {
  // One-time code to confirm the email address (FR02, docs/DEVIATIONS.md W21)
  verifyCode: {
    en: ({ name, code, minutes }) =>
      codeEmail(`${code} is your Smart Green Hub confirmation code`, {
        greeting: `Hello ${name},`,
        intro: 'Enter this code in Smart Green Hub to confirm your email address:',
        code,
        validity: `The code works once and is valid for ${minutes} minutes.`,
        ignore: 'If you did not create an account, you can ignore this email.',
      }),
    rw: ({ name, code, minutes }) =>
      codeEmail(`${code} ni kode yawe yo kwemeza - Smart Green Hub`, {
        greeting: `Muraho ${name},`,
        intro: 'Andika iyi kode muri Smart Green Hub kugira ngo wemeze imeri yawe:',
        code,
        validity: `Kode ikora rimwe gusa kandi imara iminota ${minutes}.`,
        ignore: 'Niba utafunguye konti, wirengagize iyi imeri.',
      }),
  },
  // One-time code to choose a new password (FR17)
  resetCode: {
    en: ({ name, code, minutes }) =>
      codeEmail(`${code} is your Smart Green Hub password reset code`, {
        greeting: `Hello ${name},`,
        intro: 'Enter this code in Smart Green Hub to choose a new password:',
        code,
        validity: `The code works once and is valid for ${minutes} minutes.`,
        ignore: 'If you did not ask to reset your password, ignore this email: your password stays the same.',
      }),
    rw: ({ name, code, minutes }) =>
      codeEmail(`${code} ni kode yo guhindura ijambo ry'ibanga - Smart Green Hub`, {
        greeting: `Muraho ${name},`,
        intro: "Andika iyi kode muri Smart Green Hub kugira ngo uhitemo ijambo ry'ibanga rishya:",
        code,
        validity: `Kode ikora rimwe gusa kandi imara iminota ${minutes}.`,
        ignore: "Niba atari wowe wabisabye, wirengagize iyi imeri: ijambo ry'ibanga ryawe ntirihinduka.",
      }),
  },
  passwordChanged: {
    en: ({ name }) => ({
      subject: 'Your password was changed - Smart Green Hub',
      text: `Hello ${name},\n\nYour Smart Green Hub password was changed and you were signed out on all devices.\nIf this was not you, reset your password now at ${appUrl()}/forgot-password.`,
    }),
    rw: ({ name }) => ({
      subject: "Ijambo ry'ibanga ryawe ryahinduwe - Smart Green Hub",
      text: `Muraho ${name},\n\nIjambo ry'ibanga rya Smart Green Hub ryahinduwe kandi wasohowe ku bikoresho byose.\nNiba atari wowe, hindura ijambo ry'ibanga nonaha kuri ${appUrl()}/forgot-password.`,
    }),
  },
  verificationApproved: {
    en: ({ name, orgName }) => ({
      subject: 'Your account is approved - Smart Green Hub',
      text: `Hello ${name},\n\n"${orgName}" has been approved by the administrator. You can now use all features.\nSign in: ${appUrl()}/login`,
    }),
    rw: ({ name, orgName }) => ({
      subject: 'Konti yawe yemejwe - Smart Green Hub',
      text: `Muraho ${name},\n\n"${orgName}" yemejwe n'umuyobozi. Ubu ushobora gukoresha serivisi zose.\nInjira: ${appUrl()}/login`,
    }),
  },
  verificationRejected: {
    en: ({ name, orgName, reason }) => ({
      subject: 'Please correct your details - Smart Green Hub',
      text: `Hello ${name},\n\nThe administrator could not approve "${orgName}" yet.\nReason: ${reason}\n\nPlease sign in, correct your details and submit them again: ${appUrl()}/login`,
    }),
    rw: ({ name, orgName, reason }) => ({
      subject: 'Kosora amakuru yawe - Smart Green Hub',
      text: `Muraho ${name},\n\nUmuyobozi ntarabasha kwemeza "${orgName}".\nImpamvu: ${reason}\n\nInjira, ukosore amakuru yawe maze wongere uyohereze: ${appUrl()}/login`,
    }),
  },
};

// Builds { subject, text } for a template in the given language (falls back to English).
function render(name, language, data) {
  const template = templates[name];
  return (template[language] || template.en)(data);
}

// ---- Notification emails (one per notification type, FR14) ----
// TODO(translation review): Kinyarwanda texts below need review.
const LEVELS = { en: { low: 'Low', medium: 'Medium', high: 'High' }, rw: { low: 'Hasi', medium: 'Hagati', high: 'Hejuru' } };
const ACTIONS = {
  en: {
    reduce_or_discount: 'reduce the next planting or offer a discount',
    discount_or_transplant: 'offer a discount or transplant',
    surplus_board_or_donate: 'post the plants on the Surplus Board or donate them',
  },
  rw: {
    reduce_or_discount: 'gabanya ibyo uzatera ubutaha cyangwa ugabanye igiciro',
    discount_or_transplant: 'gabanya igiciro cyangwa wimure ingemwe',
    surplus_board_or_donate: 'shyira ibimera ku rubuga rw\'ibirenze cyangwa ubitange',
  },
};

const notificationTexts = {
  alert_created: {
    en: (p) => ({
      subject: `${LEVELS.en[p.level]} surplus risk: ${p.species}`,
      text: `Batch #${p.batch_id} (${p.species}) has a ${LEVELS.en[p.level]} surplus risk: about ${p.projected_unsold} plants may stay unsold, ${p.days_left} days left in the prime window.\nSuggested action: ${ACTIONS.en[p.action]}.\nYou decide what to do: ${appUrl()}/operator/alerts`,
    }),
    rw: (p) => ({
      subject: `Ibyago by'ibirenze ${LEVELS.rw[p.level]}: ${p.species}`,
      text: `Icyiciro #${p.batch_id} (${p.species}) gifite ibyago ${LEVELS.rw[p.level]}: ingemwe zigera kuri ${p.projected_unsold} zishobora kutagurishwa, hasigaye iminsi ${p.days_left}.\nIcyo ugirwa inama: ${ACTIONS.rw[p.action]}.\nWowe ufata icyemezo: ${appUrl()}/operator/alerts`,
    }),
  },
  request_created: {
    en: (p) => ({
      subject: `New plant request from ${p.institution}`,
      text: `${p.institution} requested ${p.quantity} ${p.species} from your Surplus Board listing.\nPurpose: ${p.purpose}\nApprove or decline: ${appUrl()}/operator/requests`,
    }),
    rw: (p) => ({
      subject: `Ubusabe bushya buvuye kuri ${p.institution}`,
      text: `${p.institution} yasabye ${p.quantity} ${p.species} ku bimera byawe birenze.\nIcyo bizakoreshwa: ${p.purpose}\nEmeza cyangwa wange: ${appUrl()}/operator/requests`,
    }),
  },
  request_decided: {
    en: (p) => ({
      subject: p.decision === 'approved' ? `Request approved: ${p.species}` : `Request declined: ${p.species}`,
      text: `${p.nursery} ${p.decision === 'approved' ? 'approved' : 'declined'} your request for ${p.quantity} ${p.species}.${p.reason ? `\nReason: ${p.reason}` : ''}\n${appUrl()}/institution/requests`,
    }),
    rw: (p) => ({
      subject: p.decision === 'approved' ? `Ubusabe bwemejwe: ${p.species}` : `Ubusabe bwanzwe: ${p.species}`,
      text: `${p.nursery} ${p.decision === 'approved' ? 'yemeje' : 'yanze'} ubusabe bwawe bwa ${p.quantity} ${p.species}.${p.reason ? `\nImpamvu: ${p.reason}` : ''}\n${appUrl()}/institution/requests`,
    }),
  },
  request_cancelled: {
    en: (p) => ({ subject: `Request cancelled: ${p.species}`, text: `The request for ${p.quantity} ${p.species} by ${p.institution} was cancelled. The plants are free again.\n${appUrl()}/operator/requests` }),
    rw: (p) => ({ subject: `Ubusabe bwahagaritswe: ${p.species}`, text: `Ubusabe bwa ${p.quantity} ${p.species} bwa ${p.institution} bwahagaritswe. Ibimera byongeye kuboneka.\n${appUrl()}/operator/requests` }),
  },
  handover_confirmed: {
    en: (p) => ({ subject: `Please confirm the hand-over: ${p.species}`, text: `The other party confirmed the hand-over of ${p.quantity} ${p.species}. Please confirm it too, so it can be completed.\n${appUrl()}/login` }),
    rw: (p) => ({ subject: `Emeza ihererekanya: ${p.species}`, text: `Undi muntu yemeje ihererekanya rya ${p.quantity} ${p.species}. Nawe wemeze kugira ngo birangire.\n${appUrl()}/login` }),
  },
  handover_completed: {
    en: (p) => ({ subject: `Hand-over completed: ${p.species}`, text: `The hand-over of ${p.quantity} ${p.species} is complete and recorded in the impact dashboard. Thank you for greening Kigali!\n${appUrl()}/login` }),
    rw: (p) => ({ subject: `Ihererekanya ryarangiye: ${p.species}`, text: `Ihererekanya rya ${p.quantity} ${p.species} ryarangiye kandi ryanditswe. Murakoze gutoshya Kigali!\n${appUrl()}/login` }),
  },
  listing_expired: {
    en: (p) => ({ subject: `Listing expired: ${p.species}`, text: `Your Surplus Board listing of ${p.species} expired. Open requests were cancelled and the plants are free again.\n${appUrl()}/operator/surplus` }),
    rw: (p) => ({ subject: `Itangazo ryarangiye: ${p.species}`, text: `Itangazo ryawe rya ${p.species} ryarangiye. Ubusabe bwari butegereje bwahagaritswe.\n${appUrl()}/operator/surplus` }),
  },
  verification_approved: { en: (p) => render('verificationApproved', 'en', p), rw: (p) => render('verificationApproved', 'rw', p) },
  verification_rejected: { en: (p) => render('verificationRejected', 'en', p), rw: (p) => render('verificationRejected', 'rw', p) },
};

function renderNotification(type, language, payload) {
  const template = notificationTexts[type];
  if (!template) return null;
  return (template[language] || template.en)(payload);
}

module.exports = { render, renderNotification, appUrl };
