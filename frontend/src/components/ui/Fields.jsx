// Labelled form fields with translated error messages.
// `error` is a code from the API (e.g. "invalid_email"), turned into text with t('fieldErrors.<code>').
import { useId } from 'react'
import { useI18n } from '../../i18n/I18nProvider'

const inputBase =
  'mt-1 block min-h-12 w-full rounded-xl border bg-surface px-3 text-base text-ink placeholder:text-ink-soft/60 focus:border-teal focus:outline-none'

function FieldShell({ id, label, hint, error, optional, children }) {
  const { t } = useI18n()
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-ink-soft"> ({t('common.optional')})</span>}
      </label>
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

export function TextField({ label, hint, error, optional, className = '', ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        className={`${inputBase} ${error ? 'border-risk-high-text' : 'border-line'} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
    </FieldShell>
  )
}

export function TextArea({ label, hint, error, optional, ...props }) {
  const id = useId()
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea
        id={id}
        rows={3}
        className={`${inputBase} py-2 ${error ? 'border-risk-high-text' : 'border-line'}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...props}
      />
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
        className={`${inputBase} ${error ? 'border-risk-high-text' : 'border-line'}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
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
