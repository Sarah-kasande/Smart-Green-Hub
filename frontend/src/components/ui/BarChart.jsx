// A simple bar chart drawn with SVG (no chart library).
// data: [{ label: 'Oct', value: 12 }, ...]  Values are also written above the bars, and a
// hidden table gives screen readers the same numbers.
export default function BarChart({ data, title, format = (v) => v, height = 180, colorClass = 'fill-leaf' }) {
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.value), 1)
  const barWidth = 36
  const gap = 18
  const width = data.length * (barWidth + gap) + gap
  const chartTop = 22
  const chartHeight = height - chartTop - 26

  return (
    <figure className="w-full">
      <div className="overflow-x-auto">
        <svg role="img" aria-label={title} viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-full" style={{ maxHeight: height, minWidth: Math.min(width, 320) }}>
          {data.map((d, i) => {
            const barHeight = Math.max(2, (d.value / max) * chartHeight)
            const x = gap + i * (barWidth + gap)
            const y = chartTop + chartHeight - barHeight
            return (
              <g key={d.label}>
                <rect x={x} y={y} width={barWidth} height={barHeight} rx="6" className={colorClass} />
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="fill-ink text-[11px] font-semibold">
                  {format(d.value)}
                </text>
                <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" className="fill-ink-soft text-[11px]">
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
