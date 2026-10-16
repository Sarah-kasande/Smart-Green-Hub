// One Axios instance for every API call.
//
// baseURL is "/api": the browser always talks to its own site.
//  - Locally, Vite forwards /api to the Express server (vite.config.js).
//  - On Vercel, vercel.json rewrites /api to the Render API.
// Because of this the login cookie is "first-party" and works in every browser.
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  // CSRF protection: Axios copies the sgh_csrf cookie into the X-CSRF-Token header on
  // every request. The server compares the two (see backend/src/middleware/csrf.js).
  xsrfCookieName: 'sgh_csrf',
  xsrfHeaderName: 'X-CSRF-Token',
})

// Returns the error code from an API error (e.g. "INVALID_CREDENTIALS"), or a fallback
// code when the server could not be reached at all.
export function errorCode(error) {
  if (error?.response?.data?.code) return error.response.data.code
  if (error?.response) return 'SERVER_ERROR'
  return 'NETWORK_ERROR'
}

// Field-level validation codes, e.g. { email: 'invalid_email' }
export function fieldErrors(error) {
  return error?.response?.data?.details?.fields || {}
}

export default api
