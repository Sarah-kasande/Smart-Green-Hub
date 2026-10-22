// Add a batch (FR04). Works offline: the batch is saved on the phone and synced later (FR13).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useSpecies } from '../../offline/useOfflineData'
import { record } from '../../offline/sync'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import { SelectField, TextField } from '../../components/ui/Fields'
import { Disclosure, PageHeader } from '../../components/ui/Layout'
import { todayIso } from '../../utils/format'

export default function BatchNew() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const species = useSpecies()
  const [form, setForm] = useState({ species_id: '', quantity: '', planting_date: todayIso(), unit_price: '', days_to_ready: '', prime_days: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const chosen = species.find((s) => s.id === Number(form.species_id))

  async function submit(event) {
    event.preventDefault()
    const missing = {}
    if (!form.species_id) missing.species_id = 'required'
    if (!(Number(form.quantity) > 0)) missing.quantity = 'invalid_quantity'
    if (!form.planting_date) missing.planting_date = 'required'
    setFields(missing)
    if (Object.keys(missing).length) return

    setBusy(true)
    setError(null)
    const payload = {
      species_id: Number(form.species_id),
      quantity: Number(form.quantity),
      planting_date: form.planting_date,
      unit_price: Number(form.unit_price) || 0,
    }
    if (form.days_to_ready) payload.days_to_ready = Number(form.days_to_ready)
    if (form.prime_days) payload.prime_days = Number(form.prime_days)
    const result = await record('batch', payload)
    setBusy(false)
    if (result.status === 'conflict') return setError(result.code)
    navigate('/operator/batches', { state: { notice: { type: result.status === 'synced' ? 'success' : 'warning', text: result.status === 'synced' ? 'batches.created' : 'sync.savedOffline' } } })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t('batches.newTitle')} />
      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}
          <SelectField
            label={t('batches.species')}
            value={form.species_id}
            onChange={set('species_id')}
            error={fields.species_id}
            placeholder={t('auth.choose')}
            options={species.map((s) => ({ value: s.id, label: s.kinyarwanda_name ? `${s.common_name} (${s.kinyarwanda_name})` : s.common_name }))}
            hint={chosen ? t('batches.defaultsHint', { days: chosen.default_days_to_ready, prime: chosen.default_prime_days }) : null}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t('batches.quantity')} type="number" inputMode="numeric" min="1" value={form.quantity} onChange={set('quantity')} error={fields.quantity} />
            <TextField label={t('batches.plantingDate')} type="date" value={form.planting_date} onChange={set('planting_date')} error={fields.planting_date} />
          </div>
          <TextField label={t('batches.unitPrice')} type="number" inputMode="numeric" min="0" value={form.unit_price} onChange={set('unit_price')} optional />
          <Disclosure summary={t('batches.advanced')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label={t('batches.daysToReady')} type="number" min="1" value={form.days_to_ready} onChange={set('days_to_ready')} placeholder={chosen?.default_days_to_ready} optional />
              <TextField label={t('batches.primeDays')} type="number" min="1" value={form.prime_days} onChange={set('prime_days')} placeholder={chosen?.default_prime_days} optional />
            </div>
          </Disclosure>
          <Button type="submit" full disabled={busy}>
            {busy ? t('common.saving') : t('batches.save')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
