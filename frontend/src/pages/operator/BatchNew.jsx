// Add a batch (FR04). Works offline: the batch is saved on the phone and synced later (FR13).
// The ready date and prime window always come from the administrator's species rules; a nursery
// never enters them (docs/DEVIATIONS.md W39).
// A plant that is not in the list: "My species is not listed" -> name, plant type and an optional
// local name. The species is sent to the administrator for approval together with the batch.
// Before that, similar names are shown ("Did you mean ...?") so the same plant is not added twice.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import { useSpecies } from '../../offline/useOfflineData'
import { record } from '../../offline/sync'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import { SelectField, TextField } from '../../components/ui/Fields'
import { PageHeader } from '../../components/ui/Layout'
import { todayIso } from '../../utils/format'
import { findMatches, normalizeName } from '../../utils/speciesNames'

const NEW = 'new' // value of the "My species is not listed" option
const CATEGORIES = ['flower', 'tree', 'shrub', 'other']

const speciesLabel = (t, s) => {
  const name = s.kinyarwanda_name ? `${s.common_name} (${s.kinyarwanda_name})` : s.common_name
  return s.status === 'pending' ? `${name} · ${t('species.waitingShort')}` : name
}

// "Did you mean ...?" against the server (all approved and waiting species), or offline against
// the species saved on the phone
async function similarSpecies(name, savedList) {
  try {
    const { data } = await api.get('/operator/species/similar', { params: { name } })
    return data
  } catch {
    return findMatches(savedList, name)
  }
}

export default function BatchNew() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { species: savedSpecies, loaded } = useSpecies()
  // Species chosen from a "Did you mean ...?" answer that are not in this nursery's list
  const [extra, setExtra] = useState([])
  const species = [...savedSpecies, ...extra.filter((e) => !savedSpecies.some((s) => s.id === e.id))]
  const noSpecies = loaded && savedSpecies.length === 0
  const [form, setForm] = useState({ species_id: '', quantity: '', planting_date: todayIso(), unit_price: '' })
  const [proposal, setProposal] = useState({ common_name: '', category: '', kinyarwanda_name: '' })
  const [matches, setMatches] = useState(null) // { exact, similar } while asking "Did you mean ...?"
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})

  // With no approved species yet, the only way is to propose one
  const speciesValue = form.species_id || (noSpecies ? NEW : '')
  const isNew = speciesValue === NEW
  const chosen = species.find((s) => s.id === Number(speciesValue))
  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value })
    if (key === 'species_id') setMatches(null)
  }
  const setNew = (key) => (e) => {
    setProposal({ ...proposal, [key]: e.target.value })
    setMatches(null)
  }

  function checkFields() {
    const missing = {}
    if (!speciesValue) missing.species_id = 'required'
    if (isNew && normalizeName(proposal.common_name).length < 2) missing.common_name = 'required'
    if (isNew && !proposal.category) missing.category = 'required'
    if (!(Number(form.quantity) > 0)) missing.quantity = 'invalid_quantity'
    if (!form.planting_date) missing.planting_date = 'required'
    setFields(missing)
    return Object.keys(missing).length === 0
  }

  // Saves the batch. speciesChoice: { species_id } or { new_species }
  // waiting: the species is not approved yet (the batch waits for species approval)
  async function save(speciesChoice, waiting) {
    setBusy(true)
    setError(null)
    const payload = {
      ...speciesChoice,
      quantity: Number(form.quantity),
      planting_date: form.planting_date,
      unit_price: Number(form.unit_price) || 0,
    }
    const result = await record('batch', payload)
    setBusy(false)
    if (result.status === 'conflict') return setError(result.code)
    const text = result.status !== 'synced' ? 'sync.savedOffline' : waiting ? 'batches.createdWaiting' : 'batches.created'
    navigate('/operator/batches', { state: { notice: { type: result.status === 'synced' ? 'success' : 'warning', text } } })
  }

  const newSpeciesPayload = () => ({
    new_species: {
      common_name: proposal.common_name.trim(),
      category: proposal.category,
      kinyarwanda_name: proposal.kinyarwanda_name.trim() || null,
      // The nursery saw the similar names (or there were none) and said it is a new species
      confirmed: true,
    },
  })

  async function submit(event) {
    event.preventDefault()
    if (!checkFields()) return
    if (!isNew) return save({ species_id: Number(speciesValue) }, chosen?.status === 'pending')
    // A new name: first look for the same or a similar species
    setBusy(true)
    const found = await similarSpecies(proposal.common_name.trim(), savedSpecies)
    setBusy(false)
    if (found.exact || found.similar.length) return setMatches(found)
    return save(newSpeciesPayload(), true)
  }

  // "Use this species" in the Did you mean box
  function chooseExisting(s) {
    if (!savedSpecies.some((x) => x.id === s.id)) setExtra([...extra, s])
    setForm({ ...form, species_id: String(s.id) })
    setMatches(null)
    save({ species_id: s.id }, s.status === 'pending')
  }

  const options = [
    ...species.map((s) => ({ value: s.id, label: speciesLabel(t, s) })),
    { value: NEW, label: t('batches.notListed') },
  ]
  let hint = null
  if (chosen?.status === 'approved') hint = t('batches.rulesHint', { days: chosen.default_days_to_ready, prime: chosen.default_prime_days })
  if (chosen?.status === 'pending') hint = t('batches.pendingHint')
  const suggestionList = matches ? [matches.exact, ...matches.similar].filter(Boolean) : []

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t('batches.newTitle')} />
      {noSpecies && <Notice type="info">{t('batches.noSpeciesYet')}</Notice>}
      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}
          <SelectField
            label={t('batches.species')}
            value={speciesValue}
            onChange={set('species_id')}
            error={fields.species_id}
            placeholder={t('auth.choose')}
            options={options}
            hint={hint}
          />

          {isNew && (
            <div className="space-y-3 rounded-xl bg-canvas p-3">
              <TextField label={t('batches.newSpeciesName')} value={proposal.common_name} onChange={setNew('common_name')} error={fields.common_name} maxLength={120} />
              <SelectField
                label={t('species.category')}
                value={proposal.category}
                onChange={setNew('category')}
                error={fields.category}
                placeholder={t('auth.choose')}
                options={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))}
              />
              <TextField label={t('batches.newSpeciesLocal')} value={proposal.kinyarwanda_name} onChange={setNew('kinyarwanda_name')} maxLength={120} optional />
              <p className="text-sm text-ink-soft">{t('batches.newSpeciesHint')}</p>
            </div>
          )}

          {/* Did you mean ...? The same plant may already be in the list (or waiting) */}
          {matches && (
            <div role="status" className="space-y-3 rounded-xl border border-line bg-info p-3">
              <p className="font-semibold">{matches.exact ? t('batches.alreadyListed') : t('batches.didYouMean')}</p>
              <ul className="space-y-2">
                {suggestionList.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{speciesLabel(t, s)}</span>
                    <Button variant="secondary" onClick={() => chooseExisting(s)} disabled={busy} aria-label={`${t('batches.useThis')}: ${s.common_name}`}>
                      {t('batches.useThis')}
                    </Button>
                  </li>
                ))}
              </ul>
              {!matches.exact && (
                <Button variant="ghost" onClick={() => save(newSpeciesPayload(), true)} disabled={busy}>
                  {t('batches.addAsNew', { name: proposal.common_name.trim() })}
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t('batches.quantity')} type="number" inputMode="numeric" min="1" value={form.quantity} onChange={set('quantity')} error={fields.quantity} />
            <TextField label={t('batches.plantingDate')} type="date" value={form.planting_date} onChange={set('planting_date')} error={fields.planting_date} />
          </div>
          <TextField label={t('batches.unitPrice')} type="number" inputMode="numeric" min="0" value={form.unit_price} onChange={set('unit_price')} optional />
          <Button type="submit" full disabled={busy}>
            {busy ? t('common.saving') : t('batches.save')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
