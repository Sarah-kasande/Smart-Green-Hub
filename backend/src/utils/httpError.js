// An error with an HTTP status and a short machine-readable code.
// The frontend turns the code into an English or Kinyarwanda message (NFR04),
// so the API never needs to know which language the user reads.
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = HttpError;
