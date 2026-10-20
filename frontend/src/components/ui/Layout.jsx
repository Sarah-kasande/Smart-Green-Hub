// Building blocks used by most pages.
import { useId } from 'react'
import Icon from './Icon'
import Card from './Card'

export function PageHeader({ title, intro, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1 max-w-3xl text-ink-soft">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, hint, icon, tone = 'leaf' }) {
  const tones = {
    leaf: 'bg-leaf-light text-leaf-text',
    amber: 'bg-risk-medium text-risk-medium-text',
    red: 'bg-risk-high text-risk-high-text',
    teal: 'bg-teal-light text-teal-text',
    blue: 'bg-info text-ink',
  }
  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-soft">{label}</p>
        <p className="mt-1 text-2xl font-bold sm:text-3xl">{value}</p>
        {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      </div>
      {icon && (
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon name={icon} />
        </span>
      )}
    </Card>
  )
}

export function EmptyState({ icon = 'info', title, text, action }) {
  return (
    <Card className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-canvas text-ink-soft">
        <Icon name={icon} />
      </span>
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-md text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </Card>
  )
}

// A row of toggle buttons, e.g. status filters. options: [{ value, label, count? }]
export function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-12 rounded-xl px-4 font-semibold ${value === o.value ? 'bg-navy text-white' : 'border border-line bg-surface text-ink hover:bg-canvas'}`}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={`ml-2 rounded-full px-2 text-sm ${value === o.value ? 'bg-white/20' : 'bg-canvas'}`}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// A label + value pair inside detail cards
export function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  )
}

// Collapsible section (native <details>, keyboard accessible)
export function Disclosure({ summary, children, defaultOpen = false }) {
  const id = useId()
  return (
    <details className="group rounded-xl border border-line bg-surface" open={defaultOpen}>
      <summary id={id} className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-semibold">
        {summary}
        <Icon name="arrowRight" size={18} className="transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-line p-4">{children}</div>
    </details>
  )
}
