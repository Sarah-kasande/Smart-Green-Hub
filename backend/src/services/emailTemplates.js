// Email texts in English and Kinyarwanda. Each email uses the user's preferred language (FR18).
// TODO(translation review): all Kinyarwanda texts below need review by a native speaker.

const appUrl = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

const templates = {
  verifyEmail: {
    en: ({ name, link }) => ({
      subject: 'Confirm your email - Smart Green Hub',
      text: `Hello ${name},\n\nPlease confirm your email address by opening this link:\n${link}\n\nThe link works once and expires in 24 hours.\nIf you did not register, you can ignore this email.`,
    }),
    rw: ({ name, link }) => ({
      subject: 'Emeza imeri yawe - Smart Green Hub',
      text: `Muraho ${name},\n\nEmeza aderesi ya imeri yawe ufungura uyu murongo:\n${link}\n\nUmurongo ukora rimwe gusa kandi urangira nyuma y'amasaha 24.\nNiba utiyandikishije, wirengagize iyi imeri.`,
    }),
  },
  resetPassword: {
    en: ({ name, link }) => ({
      subject: 'Reset your password - Smart Green Hub',
      text: `Hello ${name},\n\nUse this link to choose a new password:\n${link}\n\nThe link works once and expires in 10 minutes.\nIf you did not ask for this, you can ignore this email; your password stays the same.`,
    }),
    rw: ({ name, link }) => ({
      subject: "Hindura ijambo ry'ibanga - Smart Green Hub",
      text: `Muraho ${name},\n\nKoresha uyu murongo uhitemo ijambo ry'ibanga rishya:\n${link}\n\nUmurongo ukora rimwe gusa kandi urangira nyuma y'iminota 10.\nNiba atari wowe wabisabye, wirengagize iyi imeri; ijambo ry'ibanga ryawe ntirihinduka.`,
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

module.exports = { render, appUrl };
