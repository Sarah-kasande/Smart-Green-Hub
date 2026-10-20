const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/public', require('./public.routes'));
router.use('/me', require('./me.routes'));
router.use('/uploads', require('./uploads.routes'));
router.use('/operator', require('./operator.routes'));
router.use('/institution', require('./institution.routes'));
router.use('/admin', require('./admin.routes'));
// species, board, notifications (signed-in users of any role)
router.use('/', require('./shared.routes'));

module.exports = router;
