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
  // A request may take long while the free Render server wakes up (up to about 50 s),
  // but it never waits forever: after 60 s it fails with TIMEOUT and the page offers "Try again".
  timeout: 60_000,
})

// Returns the error code from an API error (e.g. "INVALID_CREDENTIALS"), or a fallback
// code when the server could not be reached at all.
export function errorCode(error) {
  const data = error?.response?.data
  // The API does not know this address at all: usually the API is running an older version
  // than the app (for example not yet redeployed). Older APIs answered NOT_FOUND with this message.
  if (data?.code === 'ROUTE_NOT_FOUND' || (data?.code === 'NOT_FOUND' && data?.message === 'This API route does not exist')) {
    return 'ROUTE_NOT_FOUND'
  }
  if (data?.code) return data.code
  if (error?.response) return 'SERVER_ERROR'
  if (error?.code === 'ECONNABORTED') return 'TIMEOUT'
  return 'NETWORK_ERROR'
}

// Field-level validation codes, e.g. { email: 'invalid_email' }
export function fieldErrors(error) {
  return error?.response?.data?.details?.fields || {}
}

export default api
