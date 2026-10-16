// Detects the real type of an uploaded file from its first bytes ("magic numbers"),
// instead of trusting the file name or the Content-Type header (NFR03).
const SIGNATURES = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // "%PDF-"
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
];

// Returns the detected MIME type, or null if the file is not a PDF, PNG or JPEG.
function detectMimeType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  for (const sig of SIGNATURES) {
    if (buffer.length >= sig.bytes.length && sig.bytes.every((byte, i) => buffer[i] === byte)) {
      return sig.mime;
    }
  }
  return null;
}

module.exports = { detectMimeType };
