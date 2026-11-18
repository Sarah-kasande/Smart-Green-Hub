// Help requests from signed-in nursery operators and institutions (docs/DEVIATIONS.md W51).
// Open to accounts that are still waiting for approval too: they may need help most.
// A user only ever sees their own tickets (supportService answers "not found" for anyone else's).
const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const support = require('../services/supportService');
const { SUPPORT_CATEGORIES } = require('../utils/constants');

const router = express.Router();
router.use(requireAuth, requireRole('operator', 'institution'));
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const ticketId = param('id').isInt({ min: 1 }).withMessage('invalid').toInt();
const clientUuid = body('client_uuid').optional({ values: 'falsy' }).isUUID().withMessage('invalid');
const messageText = body('message').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 4000 }).withMessage('too_long');
const attachment = body('attachment_file_id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('invalid').toInt();

router.get('/tickets', handle(async (req, res) => res.json({ tickets: await support.listOwn(req.user) })));

router.post(
  '/tickets',
  [
    clientUuid,
    body('category').isIn(SUPPORT_CATEGORIES).withMessage('invalid_choice'),
    body('subject').isString().withMessage('required').trim().notEmpty().withMessage('required').isLength({ max: 160 }).withMessage('too_long'),
    messageText,
    attachment,
  ],
  validate,
  handle(async (req, res) => {
    const { ticket, duplicate } = await support.createTicket(req.user, req.body);
    res.status(duplicate ? 200 : 201).json({ ticket, duplicate });
  })
);

router.get('/tickets/:id', [ticketId], validate, handle(async (req, res) => res.json({ ticket: await support.getOwn(req.user.id, req.params.id) })));

router.post('/tickets/:id/messages', [ticketId, clientUuid, messageText, attachment], validate, handle(async (req, res) => {
  res.status(201).json({ ticket: await support.replyAsUser(req.user, req.params.id, req.body) });
}));

// Reopen within 14 days of resolution, optionally with a message
router.post(
  '/tickets/:id/reopen',
  [ticketId, body('message').optional({ values: 'falsy' }).isString().trim().isLength({ max: 4000 }).withMessage('too_long')],
  validate,
  handle(async (req, res) => res.json({ ticket: await support.reopen(req.user, req.params.id, { message: req.body.message || null }) }))
);

// "Was this solved?"
router.post('/tickets/:id/feedback', [ticketId, body('solved').isBoolean({ strict: true }).withMessage('invalid')], validate, handle(async (req, res) => {
  res.json({ ticket: await support.feedback(req.user, req.params.id, req.body.solved) });
}));

module.exports = router;
