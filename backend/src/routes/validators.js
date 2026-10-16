// Reusable express-validator rules. Each failure message is a short code the frontend translates.
// `when` (optional) is a condition: the rule only runs if it is true. It must come FIRST in the
// chain, because express-validator's .if() only affects the rules written after it.
const { body } = require('express-validator');
const { KIGALI_DISTRICTS, ORG_TYPES, LANGUAGES } = require('../utils/constants');

const start = (field, when) => (when ? body(field).if(when) : body(field));

// Password rules: 8-128 characters with at least one letter and one number.
const password = (field = 'password') =>
  body(field)
    .isString().withMessage('required')
    .isLength({ min: 8, max: 128 }).withMessage('weak_password')
    .matches(/[A-Za-z]/).withMessage('weak_password')
    .matches(/[0-9]/).withMessage('weak_password');

const email = (field = 'email') =>
  body(field).isString().withMessage('required').trim().isEmail().withMessage('invalid_email').isLength({ max: 190 }).withMessage('too_long');

const requiredText = (field, max, when) =>
  start(field, when).isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max }).withMessage('too_long');

const optionalText = (field, max, when) =>
  start(field, when).optional({ values: 'null' }).isString().withMessage('invalid').trim().isLength({ max }).withMessage('too_long');

const phone = (field, when) =>
  start(field, when).optional({ values: 'falsy' }).isString().trim().matches(/^\+?[0-9 ]{7,20}$/).withMessage('invalid_phone');

const district = (field, when) => start(field, when).isIn(KIGALI_DISTRICTS).withMessage('invalid_choice');
const orgType = (field, when) => start(field, when).isIn(ORG_TYPES).withMessage('invalid_choice');
const language = (field) => body(field).optional().isIn(LANGUAGES).withMessage('invalid_choice');
const token = (field = 'token') => body(field).isString().withMessage('required').matches(/^[a-f0-9]{64}$/).withMessage('invalid_link');

module.exports = { password, email, requiredText, optionalText, phone, district, orgType, language, token };
