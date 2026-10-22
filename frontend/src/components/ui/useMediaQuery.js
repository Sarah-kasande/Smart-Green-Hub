// True while a CSS media query matches, e.g. useMediaQuery('(min-width: 768px)').
// Used to draw EITHER a table (wide screens) OR stacked cards (phones), never both, so each
// value exists once on the page (for screen readers and tests).
import { useCallback, useSyncExternalStore } from 'react'

export default function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query]
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
