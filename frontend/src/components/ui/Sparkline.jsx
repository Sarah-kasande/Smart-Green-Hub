// A tiny trend line for dashboard cards (plain SVG, no chart library).
// values: [3, 5, 4, 8]. Decorative: the card's number and hint carry the meaning.
export default function Sparkline({ values, className = 'text-leaf' }) {
  if (!values || values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const width = 100
  const height = 28
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / range) * (height - 4)}`)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" className={`h-7 w-full ${className}`}>
      <polyline points={`0,${height} ${points.join(' ')} ${width},${height}`} fill="currentColor" opacity="0.12" stroke="none" />
      <polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
