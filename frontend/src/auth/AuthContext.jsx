// Keeps track of who is signed in. The session itself is an HttpOnly cookie that JavaScript
// cannot read, so we ask the server (/auth/me) who we are.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { useI18n } from '../i18n/I18nProvider'

const AuthContext = createContext(null)

// Where each role lands after signing in
// eslint-disable-next-line react-refresh/only-export-components
export function homePathFor(role) {
  if (role === 'admin') return '/admin'
  if (role === 'institution') return '/institution'
  return '/operator'
}

export function AuthProvider({ children }) {
  const { setLang } = useI18n()
  const [state, setState] = useState({ loading: true, user: null, organisation: null })

  // Stores the answer of /auth/me
  const apply = useCallback(
    (data) => {
      setState({ loading: false, user: data.user, organisation: data.organisation })
      // A signed-in user's saved language wins over the browser's last choice (FR18)
      if (data.user) setLang(data.user.preferred_language)
      return data
    },
    [setLang]
  )

  const refresh = useCallback(async () => {
    const { data } = await api.get('/auth/me')
    return apply(data)
  }, [apply])

  // Ask once when the app opens
  useEffect(() => {
    let cancelled = false
    api
      .get('/auth/me')
      .then(({ data }) => !cancelled && apply(data))
      .catch(() => !cancelled && setState({ loading: false, user: null, organisation: null }))
    return () => {
      cancelled = true
    }
  }, [apply])

  const login = useCallback(
    async (email, password) => {
      await api.post('/auth/login', { email, password })
      return refresh()
    },
    [refresh]
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setState({ loading: false, user: null, organisation: null })
    }
  }, [])

  const value = useMemo(() => ({ ...state, refresh, login, logout }), [state, refresh, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
