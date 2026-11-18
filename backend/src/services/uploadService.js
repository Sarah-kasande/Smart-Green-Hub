// Stores verification documents (and later batch photos) in MySQL and serves them only to
// the owner or an administrator (NFR03).
const path = require('path');
const { UploadedFile } = require('../models');
const HttpError = require('../utils/httpError');
const { detectMimeType } = require('../utils/fileSignature');
const { MAX_UPLOAD_BYTES, ALLOWED_MIME_TYPES, SUPPORT_IMAGE_TYPES, SUPPORT_MAX_IMAGE_BYTES } = require('../utils/constants');
const audit = require('./auditService');
const { findOwnOrganisation } = require('./verificationService');

// Keep only a safe, short file name (no folders, no control characters).
function cleanFileName(name) {
  const base = path.basename(String(name || 'document')).replace(/[\u0000-\u001f\u007f"\\]/g, '').trim();
  return (base || 'document').slice(0, 200);
}

// Checks size and the REAL file type (from the first bytes). Returns the detected MIME type.
function checkFile(buffer, declaredType) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new HttpError(400, 'FILE_REQUIRED', 'No file was sent');
  if (buffer.length > MAX_UPLOAD_BYTES) throw new HttpError(413, 'FILE_TOO_LARGE', 'The file is larger than 10 MB');
  const detected = detectMimeType(buffer);
  if (!detected || !ALLOWED_MIME_TYPES.includes(detected)) {
    throw new HttpError(415, 'UNSUPPORTED_FILE_TYPE', 'Only PDF, PNG and JPEG files are accepted');
  }
  // A file whose content does not match its declared type (e.g. an .exe renamed to .pdf) is refused.
  if (declaredType && declaredType !== detected) {
    throw new HttpError(415, 'UNSUPPORTED_FILE_TYPE', 'The file content does not match its type');
  }
  return detected;
}

async function saveVerificationDocument(user, { buffer, declaredType, fileName }) {
  const mime = checkFile(buffer, declaredType);
  const org = await findOwnOrganisation(user);
  if (!org) throw new HttpError(404, 'NOT_FOUND', 'No organisation found for this account');

  const file = await UploadedFile.create({
    owner_user_id: user.id,
    purpose: 'verification_document',
    entity_type: org.type,
    entity_id: org.row.id,
    original_name: cleanFileName(fileName),
    mime_type: mime,
    size_bytes: buffer.length,
    data: buffer,
  });
  await audit.log({ actorId: user.id, action: 'document.uploaded', entityType: org.type, entityId: org.row.id });
  return { id: file.id, original_name: file.original_name, mime_type: file.mime_type, size_bytes: file.size_bytes, created_at: file.created_at };
}

// A screenshot for a help request (docs/DEVIATIONS.md W51): PNG or JPEG only, at most 5 MB, checked by its
// real content like every upload. It is saved unattached (entity_id 0) and attached to the ticket's message
// when the ticket is sent (supportService). Only its owner and administrators can ever open it.
async function saveSupportScreenshot(user, { buffer, declaredType, fileName }) {
  if (Buffer.isBuffer(buffer) && buffer.length > SUPPORT_MAX_IMAGE_BYTES) throw new HttpError(413, 'FILE_TOO_LARGE', 'The screenshot is larger than 5 MB');
  const mime = checkFile(buffer, declaredType);
  if (!SUPPORT_IMAGE_TYPES.includes(mime)) throw new HttpError(415, 'UNSUPPORTED_FILE_TYPE', 'Only PNG and JPEG screenshots are accepted');
  const file = await UploadedFile.create({
    owner_user_id: user.id,
    purpose: 'support_screenshot',
    entity_type: 'support_message',
    entity_id: 0,
    original_name: cleanFileName(fileName),
    mime_type: mime,
    size_bytes: buffer.length,
    data: buffer,
  });
  return { id: file.id, original_name: file.original_name, mime_type: file.mime_type, size_bytes: file.size_bytes };
}

// Returns the file (with bytes) if the user may see it. Anyone else gets "not found",
// so the response does not even reveal that the file exists.
async function getFileForUser(user, fileId) {
  const file = await UploadedFile.scope('withData').findByPk(fileId);
  if (!file) throw new HttpError(404, 'NOT_FOUND', 'Not found');
  const allowed = user.role === 'admin' || file.owner_user_id === user.id;
  if (!allowed) throw new HttpError(404, 'NOT_FOUND', 'Not found');
  return file;
}

module.exports = { saveVerificationDocument, saveSupportScreenshot, getFileForUser, checkFile, cleanFileName };
