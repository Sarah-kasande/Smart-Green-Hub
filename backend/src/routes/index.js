const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/me', require('./me.routes'));
router.use('/uploads', require('./uploads.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
