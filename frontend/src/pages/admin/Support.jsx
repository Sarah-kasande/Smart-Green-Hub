// Administrator: help requests (docs/DEVIATIONS.md W51). Newest first, with search and filters by status,
// category and role. The detail shows the whole conversation, including internal notes (administrators
// only), a reply box, and "Mark as in progress / resolved". Visitors from the public contact form have no
// account: they are answered by email (the button opens the email app), and internal notes can be kept.
// Every reply, note and status change is written to the audit log by the server.
import { useRef, useState } from 'react'
import api, { errorCode } from '../../api/client'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/Badges'
import { Fact, PageHeader } from '../../components/ui/Layout'
import { DataTable, FilterSelect, SearchBox, Toolbar } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { TextArea } from '../../components/ui/Fields'
import Thread from '../../components/support/Thread'
import { formatDateTime, formatNumber } from '../../utils/format'

const STATUSES = ['all', 'open', 'in_progress', 'resolved']
const CATEGORIES = ['account', 'batches', 'requests', 'sales', 'technical', 'other']
const ROLES = ['operator', 'institution', 'public']

function Detail({ id, onClose, onChanged }) {
  const { t } = useI18n()
  const { data, error, reload } = useApi(`/admin/support/${id}`)
  const [text, setText] = useState('')
  const [internal, setInternal] = useState(false)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const ticket = data?.ticket

  async function act(fn, success) {
    setBusy(true)
    setNotice(null)
    try {
      await fn()
      setNotice({ type: 'success', text: success })
      reload()
      onChanged()
      return true
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
      return false
    } finally {
      setBusy(false)
    }
  }

  if (error) return <ErrorState code={error} onRetry={reload} />
  if (!ticket) return <PageLoader />
  const isPublic = ticket.requester.role === 'public'
  const noteOnly = isPublic || internal

  async function send(event) {
    event.preventDefault()
    if (!text.trim()) return
    const ok = await act(() => api.post(`/admin/support/${id}/messages`, { message: text.trim(), internal: noteOnly }), noteOnly ? 'support.noteSaved' : 'support.replySent')
    if (ok) setText('')
  }
  const setStatus = (status) => act(() => api.put(`/admin/support/${id}/status`, { status }), 'support.statusSaved')

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{ticket.subject}</h2>
          <p className="text-sm text-ink-soft">
            {t(`support.categories.${ticket.category}`)} · {formatDateTime(ticket.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge group="supportStatus" status={ticket.status} />
          <Button variant="ghost" onClick={onClose}>
            {t('table.closeDetails')}
          </Button>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Fact label={t('support.from')}>
          {ticket.requester.name}
          <span className="block text-sm font-normal text-ink-soft">{t(`support.roles.${ticket.requester.role}`)}</span>
          {ticket.requester.organisation && <span className="block text-sm font-normal text-ink-soft">{ticket.requester.organisation}</span>}
        </Fact>
        <Fact label={t('auth.email')}>
          <a className="break-all text-teal-text underline" href={`mailto:${ticket.requester.email}?subject=${encodeURIComponent(`Re: ${ticket.subject}`)}`}>
            {ticket.requester.email}
          </a>
        </Fact>
        {ticket.status === 'resolved' && (
          <Fact label={t('support.resolvedOn')}>
            {formatDateTime(ticket.resolved_at)}
            {ticket.resolved_by && <span className="block text-sm font-normal text-ink-soft">{ticket.resolved_by.full_name}</span>}
            {ticket.solved_feedback && <span className="block text-sm font-normal text-ink-soft">{t(ticket.solved_feedback === 'yes' ? 'support.saidSolved' : 'support.saidNotSolved')}</span>}
          </Fact>
        )}
      </dl>
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      <Thread messages={ticket.messages} requesterName={ticket.requester.name} />

      <form onSubmit={send} className="space-y-2 border-t border-line pt-4" noValidate>
        {isPublic && <Notice type="info">{t('support.publicHint')}</Notice>}
        <TextArea label={noteOnly ? t('support.noteLabel') : t('support.reply')} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} />
        {!isPublic && (
          <label className="flex min-h-12 items-center gap-3">
            <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-5 w-5 accent-leaf" />
            <span>{t('support.internalCheckbox')}</span>
          </label>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="submit" disabled={busy || !text.trim()}>
            {noteOnly ? t('support.saveNote') : t('support.sendReply')}
          </Button>
          {isPublic && (
            <a className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-4 font-semibold" href={`mailto:${ticket.requester.email}?subject=${encodeURIComponent(`Re: ${ticket.subject}`)}`}>
              {t('support.replyByEmail')}
            </a>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:flex-wrap">
        {ticket.status === 'open' && (
          <Button variant="secondary" disabled={busy} onClick={() => setStatus('in_progress')}>
            {t('support.markInProgress')}
          </Button>
        )}
        {ticket.status !== 'resolved' && (
          <Button icon="check" disabled={busy} onClick={() => setStatus('resolved')}>
            {t('support.markResolved')}
          </Button>
        )}
        {ticket.status === 'resolved' && (
          <Button variant="secondary" disabled={busy} onClick={() => setStatus('open')}>
            {t('support.markOpen')}
          </Button>
        )}
      </div>
    </Card>
  )
}

export default function Support() {
  const { t } = useI18n()
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('')
  const [role, setRole] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const detailRef = useRef(null)
  const { data, error, reload } = useApi(`/admin/support${qs({ status, category, role })}`)
  const counts = data?.counts || {}

  function open(item) {
    setSelectedId(item.id)
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const rows = (data?.items || []).filter((i) => matches(search, i.subject, i.requester.name, i.requester.email, i.requester.organisation))
  const columns = [
    {
      key: 'subject',
      header: t('support.subject'),
      primary: true,
      render: (i) => (
        <>
          {i.subject}
          <span className="block text-sm font-normal text-ink-soft">{i.requester.organisation || i.requester.name}</span>
        </>
      ),
    },
    { key: 'role', header: t('support.role'), render: (i) => t(`support.roles.${i.requester.role}`) },
    { key: 'category', header: t('support.category'), render: (i) => t(`support.categories.${i.category}`) },
    { key: 'date', header: t('support.received'), render: (i) => <span className="whitespace-nowrap">{formatDateTime(i.created_at)}</span> },
    { key: 'status', header: t('table.status'), render: (i) => <StatusBadge group="supportStatus" status={i.status} /> },
    {
      key: 'actions',
      header: t('table.actions'),
      full: true,
      render: (i) => (
        <Button variant="secondary" onClick={() => open(i)} aria-label={`${t('table.open')}: ${i.subject}`}>
          {t('table.open')}
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title={t('support.adminTitle')} meta={data && countLabel(t, rows.length)} />
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('support.search')} />
        <FilterSelect
          label={t('table.byStatus')}
          value={status}
          onChange={setStatus}
          options={STATUSES.map((s) => ({ value: s, label: `${s === 'all' ? t('table.allStatuses') : t(`supportStatus.${s}`)} (${formatNumber(counts[s] || 0)})` }))}
        />
        <FilterSelect label={t('support.category')} value={category} onChange={setCategory} options={[{ value: '', label: t('support.allCategories') }, ...CATEGORIES.map((c) => ({ value: c, label: t(`support.categories.${c}`) }))]} />
        <FilterSelect label={t('support.role')} value={role} onChange={setRole} options={[{ value: '', label: t('support.allRoles') }, ...ROLES.map((r) => ({ value: r, label: t(`support.roles.${r}`) }))]} />
      </Toolbar>
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && <DataTable caption={t('support.adminTitle')} columns={columns} rows={rows} rowKey={(i) => i.id} empty={search ? t('table.noMatch') : t('support.adminEmpty')} />}
      <div ref={detailRef}>{selectedId && <Detail key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} onChanged={reload} />}</div>
    </div>
  )
}
