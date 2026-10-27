// Fades a block in when it scrolls into view (the Magic UI "Blur Fade" look, done with a CSS
// animation so phones do not need an animation library). Content that is already on screen when
// the page opens is shown at once, so the first paint is never delayed.
// People who turn off animations get the content immediately (see index.css).
import { useEffect, useRef, useState } from 'react'

export default function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  // 'shown' = visible without animation, 'waiting' = below the fold, 'animate' = scrolled into view
  const [state, setState] = useState(() => (typeof IntersectionObserver === 'undefined' ? 'shown' : 'initial'))

  useEffect(() => {
    if (state !== 'initial') return undefined
    let first = true
    const observer = new IntersectionObserver(([entry]) => {
      if (first) {
        first = false
        if (entry.isIntersecting) {
          observer.disconnect()
          setState('shown')
        } else setState('waiting')
        return
      }
      if (entry.isIntersecting) {
        observer.disconnect()
        setState('animate')
      }
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [state])

  const look = {
    initial: '',
    shown: '',
    waiting: 'opacity-0',
    animate: 'animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500',
  }[state]
  return (
    <div ref={ref} className={`${look} ${className}`} style={state === 'animate' ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}
