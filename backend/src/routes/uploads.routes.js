// File upload and download. Files are sent as the raw request body (no multipart library needed):
// the browser sends the file bytes with Content-Type set to the file type and the file name
// in the X-File-Name header.
const express = require('express');
const { param } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimits');
const uploadService = require('../services/uploadService');
const { ALLOWED_MIME_TYPES } = require('../utils/constants');

const router = express.Router();
router.use(requireAuth);

// Reads the body as bytes for any content type, with a hard 10 MB limit.
const rawBody = express.raw({ type: () => true, limit: '10mb' });

router.post(
  '/verification-documents',
  requireRole('operator', 'institution'),
  uploadLimiter,
  rawBody,
  async (req, res, next) => {
    try {
      const declared = (req.get('content-type') || '').split(';')[0].trim().toLowerCase();
      const document = await uploadService.saveVerificationDocument(req.user, {
        buffer: req.body,
        declaredType: ALLOWED_MIME_TYPES.includes(declared) ? declared : 'unsupported',
        fileName: decodeURIComponent(req.get('x-file-name') || 'document'),
      });
      res.status(201).json({ document });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/:id', [param('id').isInt({ min: 1 }).withMessage('invalid')], validate, async (req, res, next) => {
  try {
    const file = await uploadService.getFileForUser(req.user, Number(req.params.id));
    res.set({
      'Content-Type': file.mime_type,
      'Content-Length': file.size_bytes,
      // Show in the browser; the name is encoded so special characters are safe in the header.
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
      // Private documents must never be stored by the browser, proxies or the service worker (NFR04).
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(file.data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
