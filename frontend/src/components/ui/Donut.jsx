// A small donut chart drawn with SVG (no chart library, so it is cheap on phones).
// parts: [{ key, label, value, color }]. The legend always shows the WORD and the number,
// so colour is never the only signal; the drawing itself is decorative.
export default function Donut({ parts, title, centerValue, centerLabel, size = 180 }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  const radius = 15.9155 // circumference of 100, so a value in % is a length
  let offset = 25 // start at the top
  return (
    <figure className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 42 42" className="h-full w-full" aria-hidden="true">
          <circle cx="21" cy="21" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="5" />
          {total > 0 &&
            parts
              .filter((p) => p.value > 0)
              .map((p) => {
                const length = (p.value / total) * 100
                const circle = (
                  <circle
                    key={p.key}
                    cx="21"
                    cy="21"
                    r={radius}
                    fill="none"
                    stroke={p.color}
                    strokeWidth="5"
                    strokeDasharray={`${length} ${100 - length}`}
                    strokeDashoffset={offset}
                  />
                )
                offset -= length
                return circle
              })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-bold tabular-nums">{centerValue}</p>
            <p className="text-xs text-ink-soft">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
            <span className="font-semibold">{p.label}</span>
            <span className="tabular-nums text-ink-soft">{p.value}</span>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">{title}</figcaption>
    </figure>
  )
}
