// true a moment after the page first appears (when the phone is idle).
// Pages draw their top part first and the heavier parts (charts, timelines, lists) right after,
// so the first screen appears sooner on slow phones (NFR01).
import { useEffect, useState } from 'react'

export default function useIdleReady(timeout = 1200) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const show = () => setReady(true)
    if (window.requestIdleCallback) {
      const id = window.requestIdleCallback(show, { timeout })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(show, 200)
    return () => clearTimeout(id)
  }, [timeout])
  return ready
}
