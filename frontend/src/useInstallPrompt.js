// "Install app" (PWA): Chrome, Edge and Android announce that the app can be installed with the
// beforeinstallprompt event; we keep it and show our own "Install app" button.
// iPhones have no such event: there the button explains "Share -> Add to Home Screen".
import { useEffect, useState } from 'react'

let savedEvent = null
const listeners = new Set()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // no browser mini-bar; our button is used instead
    savedEvent = event
    listeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    savedEvent = null
    listeners.forEach((fn) => fn())
  })
}

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

export default function useInstallPrompt() {
  const [, setVersion] = useState(0)
  useEffect(() => {
    const update = () => setVersion((v) => v + 1)
    listeners.add(update)
    return () => listeners.delete(update)
  }, [])

  const installed = isStandalone()
  return {
    // true when there is something to offer (a real install dialog, or the iPhone hint)
    canInstall: !installed && (Boolean(savedEvent) || isIos()),
    iosHint: !installed && !savedEvent && isIos(),
    async install() {
      if (!savedEvent) return false
      savedEvent.prompt()
      const { outcome } = await savedEvent.userChoice
      savedEvent = null
      listeners.forEach((fn) => fn())
      return outcome === 'accepted'
    },
  }
}
