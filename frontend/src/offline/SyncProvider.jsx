// Shares the connection and sync state with every screen (used by the sync chip).
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { outboxCounts, startAutoSync, subscribe, syncNow } from './sync'

const SyncContext = createContext(null)

export function SyncProvider({ children }) {
  const { user, organisation } = useAuth()
  const [online, setOnline] = useState(() => navigator.onLine)
  const [state, setState] = useState({ pending: 0, conflicts: [], lastResult: null, syncing: false })
  const isOperator = user?.role === 'operator' && organisation?.verification_status === 'approved'

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  // Re-read the outbox whenever it changes
  useEffect(() => {
    const refresh = () => outboxCounts().then(setState)
    refresh()
    return subscribe(refresh)
  }, [])

  // Operators: send waiting changes when the app opens and keep syncing automatically
  useEffect(() => {
    if (!isOperator) return
    startAutoSync()
    syncNow()
  }, [isOperator])

  const value = useMemo(() => ({ online, isOperator, ...state, syncNow }), [online, isOperator, state])
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSync() {
  return useContext(SyncContext)
}
