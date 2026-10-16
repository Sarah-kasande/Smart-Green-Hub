// Runs after express-validator rules. If any field is invalid, answers 400 with one short code
// per field, e.g. { code: 'VALIDATION_FAILED', details: { fields: { email: 'invalid_email' } } }.
// The frontend shows a translated message for each code.
const { validationResult } = require('express-validator');
const HttpError = require('../utils/httpError');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const fields = {};
  for (const error of result.array()) {
    if (!fields[error.path]) fields[error.path] = error.msg;
  }
  return next(new HttpError(400, 'VALIDATION_FAILED', 'Some fields are not valid', { fields }));
}

module.exports = validate;
