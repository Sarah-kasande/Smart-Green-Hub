import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './theme/ThemeProvider'
import { I18nProvider } from './i18n/I18nProvider'
import { AuthProvider } from './auth/AuthContext'
import { SyncProvider } from './offline/SyncProvider'
import { registerSW } from 'virtual:pwa-register'

// PWA service worker (offline app shell). With "autoUpdate", when a new version of the app is deployed
// the new service worker takes over and the page reloads once, so nobody keeps using old screens from
// the cache. Open tabs also look for a new version every hour.
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <SyncProvider>
              <App />
            </SyncProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
