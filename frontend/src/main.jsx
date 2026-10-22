import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './theme/ThemeProvider'
import { I18nProvider } from './i18n/I18nProvider'
import { AuthProvider } from './auth/AuthContext'
import { SyncProvider } from './offline/SyncProvider'
import { startServiceWorker, warnIfVersionsDiffer } from './pwa'

// Offline app shell + silent updates after a deploy (see src/pwa.js)
startServiceWorker()
if (import.meta.env.DEV) warnIfVersionsDiffer()

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
