// A very small home-made translation system (no library).
//   const { t, lang, setLang } = useI18n()
//   t('auth.loginTitle')                    -> "Sign in" / "Injira"
//   t('account.welcome', { name: 'Aline' }) -> "Welcome, Aline"
// A key missing in Kinyarwanda falls back to English; a key missing everywhere shows the key itself.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './en'
import rw from './rw'

const dictionaries = { en, rw }
const STORAGE_KEY = 'sgh_language'

const I18nContext = createContext(null)

// Reads "a.b.c" from a nested object
function lookup(dictionary, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dictionary)
}

function readSavedLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'rw' ? 'rw' : 'en'
  } catch {
    return 'en'
  }
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readSavedLanguage)

  const setLang = useCallback((next) => {
    const value = next === 'rw' ? 'rw' : 'en'
    setLangState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Private mode: the choice simply is not remembered
    }
  }, [])

  // Screen readers pronounce the page in the right language
  useEffect(() => {
    document.documentElement.lang = lang === 'rw' ? 'rw' : 'en'
  }, [lang])

  const t = useCallback(
    (key, values) => {
      let text = lookup(dictionaries[lang], key) ?? lookup(en, key) ?? key
      if (values) {
        for (const [name, value] of Object.entries(values)) text = text.replaceAll(`{${name}}`, value)
      }
      return text
    },
    [lang]
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  return useContext(I18nContext)
}
