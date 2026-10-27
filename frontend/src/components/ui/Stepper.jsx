// Steps of a process, e.g. a surplus request: Requested -> Approved -> Handed over -> Received.
// steps: [{ label, done }]. Each step shows a word AND a tick or its number (not colour alone).
import { Check } from 'lucide-react'

export default function Stepper({ steps, label }) {
  const current = steps.findIndex((s) => !s.done)
  return (
    <ol aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((step, i) => {
        const state = step.done ? 'done' : i === current ? 'current' : 'todo'
        return (
          <li key={step.label} className="flex flex-col gap-1.5" aria-current={state === 'current' ? 'step' : undefined}>
            <span className={`h-1.5 rounded-full ${state === 'done' ? 'bg-leaf' : state === 'current' ? 'bg-teal' : 'bg-line'}`} aria-hidden="true" />
            <span className={`flex items-start gap-1 text-xs leading-snug ${state === 'todo' ? 'text-ink-soft' : 'font-semibold'}`}>
              {state === 'done' ? <Check className="mt-px size-3.5 shrink-0 text-leaf-text" aria-hidden="true" /> : <span aria-hidden="true">{i + 1}.</span>}
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
