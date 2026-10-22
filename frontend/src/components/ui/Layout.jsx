// Building blocks used by most pages.
import { useId } from 'react'
import Icon from './Icon'

// Page title on the left; a short count or summary (`meta`, e.g. "28 entries") and buttons on the right.
export function PageHeader({ title, meta, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{title}</h1>
      {(meta || actions) && (
        <div className="flex flex-wrap items-center gap-3">
          {meta && <p className="text-ink-soft">{meta}</p>}
          {actions}
        </div>
      )}
    </div>
  )
}

// A number with its label (dashboards). Text only: the label says what the number means.
export function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4">
      <p className="text-sm font-semibold text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
    </div>
  )
}

// One clear "nothing here" box, optionally with a short explanation and a button
export function EmptyState({ title, text, action }) {
  return (
    <div className="rounded-xl border border-line bg-info px-5 py-5">
      <p className="text-base text-ink">{title}</p>
      {text && <p className="mt-1 text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

// Section heading inside a page (e.g. "Impact" on the dashboard)
export function SectionTitle({ children, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">{children}</h2>
      {actions}
    </div>
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
