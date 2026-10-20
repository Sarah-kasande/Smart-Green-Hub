// Light / dark mode. The user chooses in Settings -> Appearance:
//   "system" follows the phone or computer setting, "light" and "dark" force one look.
// The choice is saved on this device (localStorage). index.html applies it before React starts,
// so the page never flashes the wrong colours.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'sgh_theme'
const ThemeContext = createContext(null)

function readChoice() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return ['light', 'dark', 'system'].includes(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

const systemPrefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }) {
  const [choice, setChoiceState] = useState(readChoice)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  // Follow changes of the device setting while the app is open
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined
    const onChange = (e) => setSystemDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const theme = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0E1621' : '#1B3350')
  }, [theme])

  const setChoice = useCallback((value) => {
    setChoiceState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Private mode: the choice lasts until the tab is closed
    }
  }, [])

  const value = useMemo(() => ({ choice, theme, setChoice }), [choice, theme, setChoice])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext)
}
