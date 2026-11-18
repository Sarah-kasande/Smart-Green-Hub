// Shared parts of the administrator's record pages: Nurseries, Institutions, Batches (docs/DEVIATIONS.md W47).
//  - the archived label, the list of linked records, the action buttons and a small edit form for the safe fields
//  - recordStatus.js: the Active / Archived / All filter; useRecordActions.jsx: Archive, Unarchive, Delete
import { useState } from 'react'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import { Pill } from '../ui/Badges'
import { SelectField, TextField } from '../ui/Fields'
import { formatDate, formatNumber } from '../../utils/format'

export function ArchivedPill({ item }) {
  const { t } = useI18n()
  if (!item.archived_at) return null
  return (
    <Pill tone="grey" icon="clock">
      {t('records.archivedOn', { date: formatDate(item.archived_at) })}
    </Pill>
  )
}

// What is linked to a record (sales, requests, ...), as a short list
export function LinksList({ links }) {
  const { t } = useI18n()
  const entries = Object.entries(links || {}).filter(([, n]) => n > 0)
  if (!entries.length) return <p className="text-sm text-ink-soft">{t('records.nothingLinked')}</p>
  return (
    <ul className="list-inside list-disc text-sm">
      {entries.map(([key, n]) => (
        <li key={key}>{t(`records.links.${key}`, { n: formatNumber(n) })}</li>
      ))}
    </ul>
  )
}

// Edit / Archive / Unarchive / Delete for one record
export function RecordButtons({ item, actions, onEdit }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {!item.archived_at && onEdit && (
        <Button variant="secondary" icon="edit" onClick={onEdit}>
          {t('records.edit')}
        </Button>
      )}
      {item.archived_at ? (
        <Button variant="secondary" onClick={() => actions.unarchive(item)}>
          {t('records.unarchive')}
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => actions.archive(item)}>
          {t('records.archive')}
        </Button>
      )}
      <Button variant="danger" onClick={() => actions.remove(item)}>
        {t('records.delete')}
      </Button>
    </div>
  )
}

// Edit form for the safe fields. fields: [{ name, label, type?: 'text'|'tel'|'number'|'select', options?, max?, optional? }]
// Only changed values are sent. A reason is asked for the audit log (optional unless `reasonRequired`).
export function RecordEditForm({ path, item, fields, initial, reasonRequired, onSaved, onCancel }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ ...initial, reason: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (name) => (e) => setForm({ ...form, [name]: e.target.value })

  async function submit(event) {
    event.preventDefault()
    const changes = {}
    for (const f of fields) {
      const value = f.type === 'number' ? (form[f.name] === '' ? undefined : Number(form[f.name])) : form[f.name]
      if (value !== undefined && value !== (initial[f.name] ?? '')) changes[f.name] = f.optional && value === '' ? null : value
    }
    if (reasonRequired?.(changes) && !form.reason.trim()) return setErrors({ reason: 'required' })
    if (form.reason.trim()) changes.reason = form.reason.trim()
    setBusy(true)
    setError(null)
    setErrors({})
    try {
      const res = await api.patch(`/admin/${path}/${item.id}`, changes)
      onSaved(res.data.item)
    } catch (err) {
      setError(errorCode(err))
      setErrors(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-line pt-4" noValidate>
      {error && error !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) =>
          f.type === 'select' ? (
            <SelectField key={f.name} label={f.label} value={form[f.name] ?? ''} onChange={set(f.name)} options={f.options} error={errors[f.name]} />
          ) : (
            <TextField
              key={f.name}
              label={f.label}
              type={f.type || 'text'}
              value={form[f.name] ?? ''}
              onChange={set(f.name)}
              maxLength={f.max}
              optional={f.optional}
              hint={f.hint}
              error={errors[f.name]}
            />
          )
        )}
      </div>
      <TextField label={t('records.editReason')} value={form.reason} onChange={set('reason')} maxLength={500} optional={!reasonRequired} error={errors.reason} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={busy}>
          {t('common.save')}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
