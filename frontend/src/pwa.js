// Service worker (offline app shell, FR13) and silent updates.
//
// How a new version reaches people, without any message on screen:
//  1. After a deploy the browser downloads the new service worker in the background
//     (when the app opens, and every hour while it stays open).
//  2. The new version waits until the person moves to another page of the app.
//  3. On that page change the new version is switched on and the page reloads once, so nobody
//     loses what they were typing. Records saved offline stay in IndexedDB and are not affected.
// The service worker only stores the app's own files and public map tiles, never /api answers
// (see vite.config.js and NFR04).
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import api from './api/client'

let updateWaiting = false
let switchToNewVersion = null

export function startServiceWorker() {
  switchToNewVersion = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateWaiting = true
    },
    onRegisteredSW(swUrl, registration) {
      if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
    },
  })
}

// Placed once inside the router: switches to a waiting new version on the next page change
export function UpdateOnNavigate() {
  const { pathname } = useLocation()
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (updateWaiting && switchToNewVersion) {
      updateWaiting = false
      switchToNewVersion(true) // activates the new service worker, then reloads this page
    }
  }, [pathname])
  return null
}

// Development only: a quiet note in the browser console when the app and the API were built from
// different git commits. Users never see anything; /api/health and the server log show the API version.
export function warnIfVersionsDiffer() {
  const app = import.meta.env.VITE_APP_VERSION || 'local'
  api
    .get('/health')
    .then(({ data }) => {
      if (data?.version && data.version !== app) console.warn(`[Smart Green Hub] app version ${app}, API version ${data.version}`)
    })
    .catch(() => {})
}
