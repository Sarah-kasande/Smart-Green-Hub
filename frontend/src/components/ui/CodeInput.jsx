// The 6-digit code field: one large input with the numeric keyboard on phones.
// Typing or pasting keeps only the digits ("123 456" or "Code: 123456" becomes "123456").
// autoComplete="one-time-code" lets phones offer the code from the email or SMS.
import { useId } from 'react'
import { useI18n } from '../../i18n/I18nProvider'

export default function CodeInput({ value, onChange, error, label }) {
  const { t } = useI18n()
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label || t('code.label')}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        // No maxLength: it would cut a pasted "123 456" to "123 45" BEFORE the space is removed.
        // onChange keeps the first 6 digits instead.
        placeholder="000000"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        className={`mt-1 block min-h-16 w-full rounded-xl border bg-surface px-4 text-center font-mono text-3xl font-bold tracking-[0.5em] text-ink placeholder:text-ink-soft/40 focus:border-teal focus:outline-none ${
          error ? 'border-risk-high-text' : 'border-line'
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm font-medium text-risk-high-text">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-soft">
          {t('code.hint')}
        </p>
      )}
    </div>
  )
}
