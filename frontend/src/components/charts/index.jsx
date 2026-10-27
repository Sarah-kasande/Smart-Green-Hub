// Lazy-loaded charts: the chart library (Recharts) is downloaded and started only when a chart is
// about to scroll into view. Until then a grey placeholder of the same size is shown, so a phone
// does not spend time on charts the person has not reached yet.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Skeleton } from '@/components/shadcn/skeleton'

const load = () => import('./Charts')
const LazySimpleBar = lazy(() => load().then((m) => ({ default: m.SimpleBarChart })))
const LazyIncomeExpense = lazy(() => load().then((m) => ({ default: m.IncomeExpenseChart })))
const LazyDonut = lazy(() => load().then((m) => ({ default: m.DonutChart })))

// Shows `children` once the placeholder comes within 200 px of the screen
function WhenNear({ height, children }) {
  const ref = useRef(null)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (near) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          setNear(true)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [near])
  const placeholder = <Skeleton className="w-full rounded-xl" style={{ height }} />
  if (!near) return <div ref={ref}>{placeholder}</div>
  return <Suspense fallback={placeholder}>{children}</Suspense>
}

export function SimpleBarChart(props) {
  return (
    <WhenNear height={props.height || 220}>
      <LazySimpleBar {...props} />
    </WhenNear>
  )
}

export function IncomeExpenseChart(props) {
  return (
    <WhenNear height={props.height || 240}>
      <LazyIncomeExpense {...props} />
    </WhenNear>
  )
}

export function DonutChart(props) {
  return (
    <WhenNear height={props.height || 200}>
      <LazyDonut {...props} />
    </WhenNear>
  )
}
