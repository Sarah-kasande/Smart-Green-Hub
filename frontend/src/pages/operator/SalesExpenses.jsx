// Sales and expenses (FR05): record (works offline), history, and profit or loss by period,
// species and batch.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api, { errorCode } from '../../api/client'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import { record } from '../../offline/sync'
import { useBatches } from '../../offline/useOfflineData'
import { IncomeExpenseChart } from '../../components/charts'
import { useAsk } from '../../components/ui/AskDialog'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { PageHeader, SectionTitle, StatCard } from '../../components/ui/Layout'
import { DataTable, FilterSelect, SearchBox, TabBar, Toolbar } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { SelectField, TextField } from '../../components/ui/Fields'
import { addDaysIso, formatDate, formatDateTime, formatMonth, formatNumber, formatRWF, todayIso } from '../../utils/format'

const EXPENSE_CATEGORIES = ['seeds', 'fertiliser', 'pesticide', 'water', 'labour', 'transport', 'tools', 'rent', 'other']

function resultNotice(result, okText) {
  if (result.status === 'synced') return { type: 'success', text: okText }
  if (result.status === 'queued') return { type: 'warning', text: 'sync.savedOffline' }
  return { type: 'error', text: `errors.${result.code}`, values: { available: result.details?.available ?? '' } }
}

function SaleForm({ initialBatch }) {
  const { t } = useI18n()
  const { batches } = useBatches()
  const [form, setForm] = useState({ batch: initialBatch || '', quantity: '', unit_price: '', customer_note: '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [fields, setFields] = useState({})
  const sellable = (batches || []).filter((b) => b.stage !== 'cleared')
  const key = (b) => (b.id ? String(b.id) : `uuid:${b.client_uuid}`)
  const chosen = sellable.find((b) => key(b) === form.batch)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(event) {
    event.preventDefault()
    const missing = {}
    if (!chosen) missing.batch = 'required'
    if (!(Number(form.quantity) > 0)) missing.quantity = 'invalid_quantity'
    setFields(missing)
    if (Object.keys(missing).length) return
    setBusy(true)
    const payload = {
      quantity: Number(form.quantity),
      unit_price: form.unit_price === '' ? chosen.unit_price : Number(form.unit_price),
      customer_note: form.customer_note || null,
      sold_at: new Date().toISOString(),
    }
    // A batch created offline has no server id yet: point at it by its client_uuid
    if (chosen.id) payload.batch_id = chosen.id
    else payload.batch_client_uuid = chosen.client_uuid
    const result = await record('sale', payload)
    setBusy(false)
    setNotice(resultNotice(result, 'sales.saleSaved'))
    if (result.status !== 'conflict') setForm({ ...form, quantity: '', customer_note: '' })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {notice && <Notice type={notice.type}>{t(notice.text, notice.values)}</Notice>}
      <SelectField
        label={t('sales.batch')}
        value={form.batch}
        onChange={set('batch')}
        error={fields.batch}
        placeholder={t('auth.choose')}
        options={sellable.map((b) => ({
          value: key(b),
          label: `${b.species?.common_name} ${b.id ? `#${b.id}` : `(${t('sync.notYetSynced')})`} · ${t('batches.available', { n: formatNumber(b.available ?? b.quantity_current) })}`,
        }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('sales.quantity')} type="number" inputMode="numeric" min="1" value={form.quantity} onChange={set('quantity')} error={fields.quantity} />
        <TextField label={t('sales.price')} type="number" inputMode="numeric" min="0" value={form.unit_price} onChange={set('unit_price')} placeholder={chosen ? String(chosen.unit_price) : ''} optional />
      </div>
      {chosen && form.quantity > 0 && (
        <p className="font-semibold">{t('sales.total', { total: formatRWF(Number(form.quantity) * (form.unit_price === '' ? chosen.unit_price : Number(form.unit_price))) })}</p>
      )}
      <TextField label={t('sales.note')} value={form.customer_note} onChange={set('customer_note')} maxLength={255} optional />
      <Button type="submit" full disabled={busy}>
        {busy ? t('common.saving') : t('sales.saveSale')}
      </Button>
    </form>
  )
}

function ExpenseForm() {
  const { t } = useI18n()
  const [form, setForm] = useState({ category: '', amount: '', spent_at: todayIso(), note: '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const [fields, setFields] = useState({})
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(event) {
    event.preventDefault()
    const missing = {}
    if (!form.category) missing.category = 'required'
    if (!(Number(form.amount) > 0)) missing.amount = 'invalid_amount'
    setFields(missing)
    if (Object.keys(missing).length) return
    setBusy(true)
    const result = await record('expense', { category: form.category, amount: Number(form.amount), spent_at: form.spent_at, note: form.note || null })
    setBusy(false)
    setNotice(resultNotice(result, 'sales.expenseSaved'))
    if (result.status !== 'conflict') setForm({ ...form, amount: '', note: '' })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {notice && <Notice type={notice.type}>{t(notice.text, notice.values)}</Notice>}
      <SelectField
        label={t('sales.category')}
        value={form.category}
        onChange={set('category')}
        error={fields.category}
        placeholder={t('auth.choose')}
        options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(`expenseCategories.${c}`) }))}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('sales.amount')} type="number" inputMode="numeric" min="1" value={form.amount} onChange={set('amount')} error={fields.amount} />
        <TextField label={t('sales.date')} type="date" value={form.spent_at} onChange={set('spent_at')} />
      </div>
      <TextField label={t('sales.note')} value={form.note} onChange={set('note')} maxLength={255} optional />
      <Button type="submit" full disabled={busy}>
        {busy ? t('common.saving') : t('sales.saveExpense')}
      </Button>
    </form>
  )
}

function History() {
  const { t } = useI18n()
  const sales = useApi('/operator/sales')
  const expenses = useApi('/operator/expenses')
  const [message, setMessage] = useState(null)
  const [search, setSearch] = useState('')
  const [askElement, ask] = useAsk()

  async function undo(kind, id) {
    const reason = await ask({ title: t('sales.undo'), label: t('sales.undoConfirm'), confirmLabel: t('sales.undo') })
    if (reason === null) return
    try {
      await api.delete(`/operator/${kind}/${id}`, { data: { reason } })
      setMessage({ type: 'success', text: 'sales.undone' })
      sales.reload()
      expenses.reload()
    } catch (err) {
      setMessage({ type: 'error', text: `errors.${errorCode(err)}` })
    }
  }

  const failed = sales.error || expenses.error
  const retry = () => {
    sales.reload()
    expenses.reload()
  }
  if (failed) return <ErrorState code={failed} onRetry={retry} />
  if (!sales.data || !expenses.data) return <PageLoader />

  const saleRows = (sales.data.sales || []).filter((s) => matches(search, s.batch?.species?.common_name, `#${s.batch_id}`, s.customer_note))
  const expenseRows = (expenses.data.expenses || []).filter((e) => matches(search, t(`expenseCategories.${e.category}`), e.note))
  const undoButton = (kind, id) => (
    <Button variant="secondary" onClick={() => undo(kind, id)}>
      {t('sales.undo')}
    </Button>
  )
  const saleColumns = [
    { key: 'batch', header: t('sales.batch'), primary: true, render: (s) => `${s.batch?.species?.common_name || ''} #${s.batch_id}` },
    { key: 'qty', header: t('impact.quantity'), align: 'right', render: (s) => formatNumber(s.quantity) },
    { key: 'price', header: t('batches.unitPrice'), align: 'right', render: (s) => formatRWF(s.unit_price) },
    { key: 'total', header: t('sales.totalLabel'), align: 'right', render: (s) => <span className="font-semibold">{formatRWF(s.quantity * s.unit_price)}</span> },
    { key: 'when', header: t('sales.date'), render: (s) => <span className="whitespace-nowrap">{formatDateTime(s.sold_at)}</span> },
    { key: 'actions', header: t('table.actions'), full: true, render: (s) => undoButton('sales', s.id) },
  ]
  const expenseColumns = [
    { key: 'category', header: t('sales.category'), primary: true, render: (e) => t(`expenseCategories.${e.category}`) },
    { key: 'amount', header: t('sales.amount'), align: 'right', render: (e) => <span className="font-semibold">{formatRWF(e.amount)}</span> },
    { key: 'date', header: t('sales.date'), render: (e) => <span className="whitespace-nowrap">{formatDate(e.spent_at)}</span> },
    { key: 'note', header: t('sales.note'), render: (e) => e.note },
    { key: 'actions', header: t('table.actions'), full: true, render: (e) => undoButton('expenses', e.id) },
  ]

  return (
    <div className="space-y-6">
      {askElement}
      {message && <Notice type={message.type}>{t(message.text)}</Notice>}
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} />
      </Toolbar>
      <section className="space-y-3">
        <SectionTitle actions={<span className="text-ink-soft">{countLabel(t, saleRows.length)}</span>}>{t('sales.salesList')}</SectionTitle>
        <DataTable caption={t('sales.salesList')} columns={saleColumns} rows={saleRows} rowKey={(s) => s.id} empty={search ? t('table.noMatch') : t('sales.noSales')} />
      </section>
      <section className="space-y-3">
        <SectionTitle actions={<span className="text-ink-soft">{countLabel(t, expenseRows.length)}</span>}>{t('sales.expensesList')}</SectionTitle>
        <DataTable caption={t('sales.expensesList')} columns={expenseColumns} rows={expenseRows} rowKey={(e) => e.id} empty={search ? t('table.noMatch') : t('sales.noExpenses')} />
      </section>
    </div>
  )
}

function periodRange(period) {
  const today = todayIso()
  if (period === 'month') return { from: `${today.slice(0, 7)}-01`, to: today }
  if (period === '3months') return { from: addDaysIso(today, -90), to: today }
  if (period === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: today }
  return {}
}

function Profit() {
  const { t } = useI18n()
  const [period, setPeriod] = useState('month')
  const { data, error, reload } = useApi(`/operator/finance${qs(periodRange(period))}`)

  return (
    <div className="space-y-5">
      <Toolbar>
        <FilterSelect label={t('sales.period')} value={period} onChange={setPeriod} options={['month', '3months', 'year', 'all'].map((p) => ({ value: p, label: t(`sales.periods.${p}`) }))} />
      </Toolbar>
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label={t('sales.income')} value={formatRWF(data.income)} hint={t('sales.unitsSold', { n: formatNumber(data.units_sold) })} />
            <StatCard label={t('sales.expensesLabel')} value={formatRWF(data.expenses)} />
            <StatCard label={data.profit < 0 ? t('sales.loss') : t('sales.profit')} value={formatRWF(data.profit)} />
          </div>
          {data.monthly.length > 0 && (
            <Card>
              <h2 className="mb-3 text-lg font-semibold">{t('sales.monthly')}</h2>
              <IncomeExpenseChart
                title={t('sales.monthly')}
                labels={{ income: t('sales.income'), expenses: t('sales.expensesLabel') }}
                data={data.monthly.map((m) => ({ label: formatMonth(m.month), income: m.income, expenses: m.expenses }))}
                format={(v) => formatNumber(v)}
              />
            </Card>
          )}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card>
              <h2 className="mb-3 font-semibold">{t('sales.bySpecies')}</h2>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {data.by_species.map((s) => (
                    <tr key={s.species}>
                      <td className="py-2">{s.species}</td>
                      <td className="py-2 text-right">{formatNumber(s.units)}</td>
                      <td className="py-2 text-right font-semibold">{formatRWF(s.income)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.by_species.length === 0 && <p className="text-ink-soft">{t('sales.noSales')}</p>}
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">{t('sales.byBatch')}</h2>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {data.by_batch.map((b) => (
                    <tr key={b.batch_id}>
                      <td className="py-2">
                        #{b.batch_id} {b.species}
                      </td>
                      <td className="py-2 text-right font-semibold">{formatRWF(b.income)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.by_batch.length === 0 && <p className="text-ink-soft">{t('sales.noSales')}</p>}
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">{t('sales.byCategory')}</h2>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-line">
                  {data.expenses_by_category.map((c) => (
                    <tr key={c.category}>
                      <td className="py-2">{t(`expenseCategories.${c.category}`)}</td>
                      <td className="py-2 text-right font-semibold">{formatRWF(c.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.expenses_by_category.length === 0 && <p className="text-ink-soft">{t('sales.noExpenses')}</p>}
            </Card>
          </div>
          <p className="text-sm text-ink-soft">{t('sales.profitNote')}</p>
        </>
      )}
    </div>
  )
}

export default function SalesExpenses() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'sale'
  const tabs = ['sale', 'expense', 'history', 'profit']

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={t('sales.title')} />
      <TabBar label={t('sales.title')} value={tab} onChange={(v) => setParams({ tab: v })} options={tabs.map((v) => ({ value: v, label: t(`sales.tabs.${v}`) }))} />
      {tab === 'sale' && (
        <Card className="max-w-2xl">
          <SaleForm initialBatch={params.get('batch') || ''} />
        </Card>
      )}
      {tab === 'expense' && (
        <Card className="max-w-2xl">
          <ExpenseForm />
        </Card>
      )}
      {tab === 'history' && <History />}
      {tab === 'profit' && <Profit />}
    </div>
  )
}
