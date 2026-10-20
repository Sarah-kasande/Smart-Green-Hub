// Turns every error into a JSON answer: { code, message, details? }.
const HttpError = require('../utils/httpError');

function notFound(req, res, next) {
  // ROUTE_NOT_FOUND (not NOT_FOUND) so the app can tell 'unknown address' apart from 'record not found'
  next(new HttpError(404, 'ROUTE_NOT_FOUND', 'This API route does not exist'));
}

// Express recognises error handlers by their four arguments, so `next` must stay.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
  }
  // Body too large (JSON over 100 KB, or an upload over 10 MB)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ code: 'FILE_TOO_LARGE', message: 'The request is too large' });
  }
  // Broken JSON in the request body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_JSON', message: 'The request body is not valid JSON' });
  }
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ code: 'DUPLICATE', message: 'This record already exists' });
  }

  // Unexpected error: log the details on the server, but show a plain message to the user.
  // Only the method, path and error are logged (never the body, which may contain passwords).
  console.error(`Unexpected error on ${req.method} ${req.path}:`, err);
  return res.status(500).json({ code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
}

module.exports = { notFound, errorHandler };
