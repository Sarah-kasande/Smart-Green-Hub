// Labelled form fields with translated error messages, built on the shadcn/ui Input, Textarea and Label.
// `error` is a code from the API (e.g. "invalid_email"), turned into text with t('fieldErrors.<code>').
// Our additions to shadcn's look: 48 px tall (touch), 16 px text (iPhones do not zoom in),
// the error text under the field, and a native <select> for dropdowns (simplest on phones and
// with screen readers).
import { useId } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import { Textarea } from '@/components/shadcn/textarea'

const fieldLook = 'mt-1.5 min-h-12 rounded-xl bg-surface px-3 text-base text-ink md:text-base placeholder:text-ink-soft/70'
const errorLook = (error) => (error ? 'border-risk-high-text' : 'border-line')

function FieldShell({ id, label, hint, error, optional, children }) {
  const { t } = useI18n()
  return (
    <div>
      <Label htmlFor={id} className="block text-sm font-semibold leading-normal text-ink">
        {label}
        {optional && <span className="font-normal text-ink-soft"> ({t('common.optional')})</span>}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-risk-high-text">
          {t(`fieldErrors.${error}`)}
        </p>
      )}
    </div>
  )
}

// aria-describedby links the field to its error (or hint), so screen readers read it with the field
const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined)

export function TextField({ label, hint, error, optional, className = '', ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <Input id={id} className={`${fieldLook} ${errorLook(error)} ${className}`} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy(id, error, hint)} {...props} />
    </FieldShell>
  )
}

export function TextArea({ label, hint, error, optional, ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <Textarea id={id} rows={3} className={`${fieldLook} py-2.5 ${errorLook(error)}`} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy(id, error, hint)} {...props} />
    </FieldShell>
  )
}

// options: [{ value, label }]
export function SelectField({ label, hint, error, optional, options, placeholder, ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <select
        id={id}
        className={`block w-full border shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${fieldLook} ${errorLook(error)}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
