// Loads data from the API for a screen.
//   const { data, error, loading, reload } = useApi('/operator/batches?stage=ready')
// Pass null as the url to skip loading. reload() fetches again (e.g. after saving something, or
// from a "Try again" button). Every request ends with data or an error code, never "loading"
// forever: the Axios client has a time limit (see client.js).
import { useCallback, useEffect, useState } from 'react'
import api, { errorCode } from './client'

export function useApi(url) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(url) })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!url) return undefined
    let cancelled = false
    api
      .get(url)
      .then((res) => !cancelled && setState({ data: res.data, error: null, loading: false }))
      .catch((err) => !cancelled && setState((s) => ({ data: s.data, error: errorCode(err), loading: false })))
    return () => {
      cancelled = true
    }
  }, [url, version])

  // Clears the old error so the page shows the spinner again while retrying
  const reload = useCallback(() => {
    setState((s) => ({ ...s, error: null, loading: true }))
    setVersion((v) => v + 1)
  }, [])

  return { ...state, reload }
}

// Builds "?a=1&b=2" leaving out empty values
export function qs(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, v)
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}
