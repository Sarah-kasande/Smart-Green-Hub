// Rules and species settings (FR15, design/admin dashbord.png "Surplus Algorithm & Species
// Configuration"): the Table 5 thresholds and the plant species with their default growing times.
import { useState } from 'react'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import { useAsk } from '../../components/ui/AskDialog'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill } from '../../components/ui/Badges'
import { PageHeader, SectionTitle } from '../../components/ui/Layout'
import { DataTable, SearchBox, Toolbar } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { SelectField, TextField } from '../../components/ui/Fields'

const CATEGORIES = ['flower', 'tree', 'shrub', 'other']

function RulesForm({ rules, onSaved }) {
  const { t } = useI18n()
  const [form, setForm] = useState({
    sales_lookback_days: rules.sales_lookback_days,
    medium_percent: Math.round(rules.medium_risk_ratio * 100),
    high_percent: Math.round(rules.high_risk_ratio * 100),
    margin_percent: Math.round(rules.safety_margin * 100),
    far_days: rules.far_days,
    near_days: rules.near_days,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})
    try {
      // The screen uses percentages; the database stores ratios (50% = 0.50)
      await api.put('/admin/rules', {
        sales_lookback_days: Number(form.sales_lookback_days),
        medium_risk_ratio: Number(form.medium_percent) / 100,
        high_risk_ratio: Number(form.high_percent) / 100,
        safety_margin: Number(form.margin_percent) / 100,
        far_days: Number(form.far_days),
        near_days: Number(form.near_days),
      })
      onSaved()
    } catch (err) {
      setError(errorCode(err))
      const f = fieldErrors(err)
      setFields({ ...f, medium_percent: f.medium_risk_ratio, high_percent: f.high_risk_ratio, margin_percent: f.safety_margin })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      <TextField label={t('rules.lookback')} type="number" min="1" max="365" value={form.sales_lookback_days} onChange={set('sales_lookback_days')} error={fields.sales_lookback_days} hint={t('rules.lookbackHint')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('rules.medium')} type="number" min="1" max="99" value={form.medium_percent} onChange={set('medium_percent')} error={fields.medium_percent} hint={t('rules.percentHint')} />
        <TextField label={t('rules.high')} type="number" min="2" max="100" value={form.high_percent} onChange={set('high_percent')} error={fields.high_percent} hint={t('rules.percentHint')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('rules.far')} type="number" min="2" value={form.far_days} onChange={set('far_days')} error={fields.far_days} />
        <TextField label={t('rules.near')} type="number" min="1" value={form.near_days} onChange={set('near_days')} error={fields.near_days} />
      </div>
      <TextField label={t('rules.margin')} type="number" min="0" max="100" value={form.margin_percent} onChange={set('margin_percent')} error={fields.margin_percent} hint={t('rules.marginHint')} />
      <Button type="submit" disabled={busy}>
        {busy ? t('common.saving') : t('rules.save')}
      </Button>
    </form>
  )
}

const EMPTY_SPECIES = { common_name: '', kinyarwanda_name: '', category: 'tree', default_days_to_ready: '', default_prime_days: '', prime_window_override: '' }

function SpeciesForm({ species, onSaved, onCancel }) {
  const { t } = useI18n()
  const [form, setForm] = useState(
    species
      ? { ...species, kinyarwanda_name: species.kinyarwanda_name || '', prime_window_override: species.prime_window_override ?? '' }
      : EMPTY_SPECIES
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const body = {
      common_name: form.common_name,
      kinyarwanda_name: form.kinyarwanda_name || null,
      category: form.category,
      default_days_to_ready: Number(form.default_days_to_ready) || 0,
      default_prime_days: Number(form.default_prime_days) || 0,
      prime_window_override: form.prime_window_override === '' ? '' : Number(form.prime_window_override),
    }
    try {
      if (species) await api.put(`/admin/species/${species.id}`, body)
      else await api.post('/admin/species', body)
      onSaved()
    } catch (err) {
      setError(errorCode(err))
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-canvas p-3" noValidate>
      {error && error !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t('species.name')} value={form.common_name} onChange={set('common_name')} error={fields.common_name} />
        <TextField label={t('species.rwName')} value={form.kinyarwanda_name} onChange={set('kinyarwanda_name')} error={fields.kinyarwanda_name} optional />
      </div>
      <SelectField label={t('species.category')} value={form.category} onChange={set('category')} options={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))} />
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label={t('species.daysToReady')} type="number" min="1" value={form.default_days_to_ready} onChange={set('default_days_to_ready')} error={fields.default_days_to_ready} />
        <TextField label={t('species.primeDays')} type="number" min="1" value={form.default_prime_days} onChange={set('default_prime_days')} error={fields.default_prime_days} />
        <TextField label={t('species.override')} type="number" min="1" value={form.prime_window_override} onChange={set('prime_window_override')} error={fields.prime_window_override} optional />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          {t('common.save')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

export default function RulesSpecies() {
  const { t } = useI18n()
  const rules = useApi('/admin/rules')
  const [showArchived, setShowArchived] = useState(false)
  const species = useApi(`/admin/species?archived=${showArchived}`)
  const [editing, setEditing] = useState(null) // species id, 'new' or null
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const [askElement, ask] = useAsk()

  async function archive(s) {
    const reason = await ask({ title: `${t('species.archive')}: ${s.common_name}`, label: t('species.archiveConfirm'), confirmLabel: t('species.archive') })
    if (reason === null) return
    await api.delete(`/admin/species/${s.id}`, { data: { reason } })
    setNotice('species.archived')
    species.reload()
  }

  async function restore(s) {
    await api.post(`/admin/species/${s.id}/restore`)
    setNotice('species.restored')
    species.reload()
  }

  function saved() {
    setEditing(null)
    setNotice('species.saved')
    species.reload()
  }

  const list = species.data?.species || []
  const rows = list.filter((s) => matches(search, s.common_name, s.kinyarwanda_name))
  const editedSpecies = list.find((s) => s.id === editing)
  const columns = [
    {
      key: 'name',
      header: t('species.name'),
      primary: true,
      render: (s) => (
        <>
          {s.common_name}
          {s.kinyarwanda_name && <span className="font-normal text-ink-soft"> · {s.kinyarwanda_name}</span>}
        </>
      ),
    },
    { key: 'category', header: t('species.category'), render: (s) => t(`categories.${s.category}`) },
    { key: 'ready', header: t('species.daysToReady'), align: 'right', render: (s) => s.default_days_to_ready },
    {
      key: 'prime',
      header: t('species.primeDays'),
      align: 'right',
      render: (s) => (
        <>
          {s.prime_window_override ?? s.default_prime_days}
          {s.prime_window_override !== null && <span className="block text-xs text-ink-soft">{t('species.overridden')}</span>}
        </>
      ),
    },
    {
      key: 'status',
      header: t('table.status'),
      render: (s) =>
        s.archived_at && (
          <Pill tone="grey" icon="close">
            {t('species.archivedLabel')}
          </Pill>
        ),
    },
    {
      key: 'actions',
      header: t('table.actions'),
      full: true,
      render: (s) => (
        <div className="flex flex-wrap gap-2">
          {s.archived_at ? (
            <Button variant="secondary" onClick={() => restore(s)}>
              {t('species.restore')}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setEditing(s.id)}>
                {t('species.edit')}
              </Button>
              <Button variant="ghost" onClick={() => archive(s)}>
                {t('species.archive')}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {askElement}
      <PageHeader title={t('rules.title')} />
      {notice && <Notice type="success">{t(notice)}</Notice>}

      <Card>
        <h2 className="text-lg font-semibold">{t('rules.thresholds')}</h2>
        <p className="mb-4 text-sm text-ink-soft">{t('rules.thresholdsHint')}</p>
        {rules.error && <ErrorState code={rules.error} onRetry={rules.reload} />}
        {!rules.data && !rules.error && <PageLoader />}
        {rules.data && (
          <div className="max-w-3xl">
            <RulesForm
              key={rules.data.rules.updated_at}
              rules={rules.data.rules}
              onSaved={() => {
                setNotice('rules.saved')
                rules.reload()
              }}
            />
          </div>
        )}
      </Card>

      <section className="space-y-4">
        <SectionTitle actions={species.data && <span className="text-ink-soft">{countLabel(t, rows.length)}</span>}>{t('species.title')}</SectionTitle>
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} />
          <label className="flex min-h-12 items-center gap-2">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-5 w-5 accent-leaf" />
            {t('species.showArchived')}
          </label>
          <span className="sm:ml-auto">
            <Button onClick={() => setEditing('new')}>{t('species.add')}</Button>
          </span>
        </Toolbar>
        {/* Adding or editing a species opens the form above the table */}
        {(editing === 'new' || editedSpecies) && (
          <SpeciesForm key={editing} species={editedSpecies} onSaved={saved} onCancel={() => setEditing(null)} />
        )}
        {species.error && <ErrorState code={species.error} onRetry={species.reload} />}
        {!species.data && !species.error && <PageLoader />}
        {species.data && (
          <DataTable caption={t('species.title')} columns={columns} rows={rows} rowKey={(s) => s.id} empty={search ? t('table.noMatch') : t('species.empty')} />
        )}
      </section>
    </div>
  )
}
