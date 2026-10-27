// A number that counts up once when it scrolls into view (the Magic UI "Number Ticker" look),
// written small so phones do not need an animation library.
// - A number already on screen when the page opens is shown straight away (fast first paint).
// - The real number is always in the page text first, so screen readers and tests read it.
// - People who turn off animations never see it count.
import { useEffect, useRef } from 'react'
import { formatNumber } from '../../utils/format'
import useMediaQuery from './useMediaQuery'

const DURATION = 900 // ms

export default function CountUp({ value, decimals = 0 }) {
  const ref = useRef(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const number = Number(value) || 0

  useEffect(() => {
    const el = ref.current
    if (!el || reduceMotion || number === 0 || typeof IntersectionObserver === 'undefined') return undefined
    let frame = null
    let first = true
    const countUp = () => {
      let start = null
      const step = (time) => {
        start = start ?? time
        const progress = Math.min(1, (time - start) / DURATION)
        const eased = 1 - (1 - progress) ** 3 // fast first, slow at the end
        el.textContent = formatNumber(number * eased, decimals)
        if (progress < 1) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (first) {
        first = false
        if (entry.isIntersecting) return observer.disconnect() // on screen at load: no animation
        el.textContent = formatNumber(0, decimals) // below the fold: start from 0
        return undefined
      }
      if (entry.isIntersecting) {
        observer.disconnect()
        countUp()
      }
      return undefined
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
      el.textContent = formatNumber(number, decimals)
    }
  }, [number, decimals, reduceMotion])

  return (
    <span ref={ref} className="tabular-nums">
      {formatNumber(number, decimals)}
    </span>
  )
}
