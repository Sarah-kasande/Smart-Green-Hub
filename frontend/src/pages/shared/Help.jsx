// Help (docs/DEVIATIONS.md W51): nurseries and institutions contact the administrator from inside the app.
//  - "Contact the administrator": category, subject, message, optional screenshot (PNG/JPEG, max 5 MB).
//    The name, role, organisation and email are attached by the server automatically.
//  - Works offline: the request is saved on the phone and sent when the connection returns
//    (offline/supportOutbox.js), with a client_uuid so it is never sent twice.
//  - "My messages": each request with its status and conversation. Reply while it is open; a resolved
//    request can be reopened within 14 days, and the sender may say whether it was solved.
import { useCallback, useEffect, useState } from 'react'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill, StatusBadge } from '../../components/ui/Badges'
import { EmptyState, PageHeader, SectionTitle } from '../../components/ui/Layout'
import { SelectField, TextArea, TextField } from '../../components/ui/Fields'
import Thread from '../../components/support/Thread'
import { discardSupport, queueSupport, waitingSupport } from '../../offline/supportOutbox'
import { subscribe } from '../../offline/sync'
import { formatDateTime } from '../../utils/format'

const CATEGORIES = ['account', 'batches', 'requests', 'sales', 'technical', 'other']
const MAX_SCREENSHOT = 5 * 1024 * 1024

// Screenshot picker: PNG or JPEG, at most 5 MB (the server checks again, by the real file content)
function ScreenshotField({ file, onChange, error, onError }) {
  const { t } = useI18n()
  function pick(event) {
    const chosen = event.target.files?.[0] || null
    event.target.value = ''
    if (!chosen) return
    if (!['image/png', 'image/jpeg'].includes(chosen.type)) return onError('support.screenshotType')
    if (chosen.size > MAX_SCREENSHOT) return onError('support.screenshotSize')
    onError(null)
    onChange(chosen)
  }
  return (
    <div>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-canvas px-3 py-2">
        <input type="file" accept="image/png,image/jpeg" onChange={pick} className="sr-only" />
        <span className="font-semibold">{t('support.addScreenshot')}</span>
        <span className="text-sm text-ink-soft">{file ? file.name : t('support.screenshotHint')}</span>
      </label>
      {file && (
        <Button variant="ghost" onClick={() => onChange(null)}>
          {t('support.removeScreenshot')}
        </Button>
      )}
      {error && <p className="mt-1 text-sm text-risk-high-text">{t(error)}</p>}
    </div>
  )
}

function NewRequest({ onDone, onCancel }) {
  const { t } = useI18n()
  const { user, organisation } = useAuth()
  const [form, setForm] = useState({ category: 'account', subject: '', message: '' })
  const [screenshot, setScreenshot] = useState(null)
  const [fileError, setFileError] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(event) {
    event.preventDefault()
    const missing = {}
    if (!form.subject.trim()) missing.subject = 'required'
    if (!form.message.trim()) missing.message = 'required'
    setErrors(missing)
    if (Object.keys(missing).length) return
    setBusy(true)
    const result = await queueSupport({ kind: 'ticket', data: { category: form.category, subject: form.subject.trim(), message: form.message.trim() }, screenshot })
    setBusy(false)
    onDone(result)
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <h2 className="text-lg font-semibold">{t('support.contactAdmin')}</h2>
        <SelectField label={t('support.category')} value={form.category} onChange={set('category')} options={CATEGORIES.map((c) => ({ value: c, label: t(`support.categories.${c}`) }))} />
        <TextField label={t('support.subject')} value={form.subject} onChange={set('subject')} maxLength={160} error={errors.subject} />
        <TextArea label={t('support.message')} value={form.message} onChange={set('message')} maxLength={4000} error={errors.message} />
        <ScreenshotField file={screenshot} onChange={setScreenshot} error={fileError} onError={setFileError} />
        <p className="text-sm text-ink-soft">
          {t('support.attached', { name: user.full_name, role: t(`roles.${user.role}`), organisation: organisation?.name || '–', email: user.email })}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={busy}>
            {t('support.send')}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function TicketDetail({ id, onClose, onChanged }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { data, error, reload } = useApi(`/support/tickets/${id}`)
  const [reply, setReply] = useState('')
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
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    } finally {
      setBusy(false)
    }
  }

  async function sendReply(event) {
    event.preventDefault()
    if (!reply.trim()) return
    setBusy(true)
    const result = await queueSupport({ kind: 'reply', ticketId: id, data: { message: reply.trim() } })
    setBusy(false)
    if (result.status === 'failed') return setNotice({ type: 'error', text: `errors.${result.code}` })
    setReply('')
    setNotice({ type: result.status === 'sent' ? 'success' : 'info', text: result.status === 'sent' ? 'support.replySent' : 'support.savedOffline' })
    reload()
    onChanged()
  }

  if (error) return <ErrorState code={error} onRetry={reload} />
  if (!ticket) return <PageLoader />
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
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      <Thread messages={ticket.messages} requesterName={user.full_name} />

      {ticket.status !== 'resolved' && (
        <form onSubmit={sendReply} className="space-y-2 border-t border-line pt-4" noValidate>
          <TextArea label={t('support.reply')} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} />
          <Button type="submit" disabled={busy || !reply.trim()}>
            {t('support.sendReply')}
          </Button>
        </form>
      )}

      {ticket.status === 'resolved' && (
        <div className="space-y-3 border-t border-line pt-4">
          {!ticket.solved_feedback ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="font-semibold sm:mr-2">{t('support.wasSolved')}</p>
              <Button variant="secondary" icon="check" disabled={busy} onClick={() => act(() => api.post(`/support/tickets/${id}/feedback`, { solved: true }), 'support.thanks')}>
                {t('support.yes')}
              </Button>
              <Button variant="secondary" icon="close" disabled={busy} onClick={() => act(() => api.post(`/support/tickets/${id}/feedback`, { solved: false }), 'support.thanks')}>
                {t('support.no')}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">{t(ticket.solved_feedback === 'yes' ? 'support.saidSolved' : 'support.saidNotSolved')}</p>
          )}
          {ticket.can_reopen ? (
            <Button variant="secondary" disabled={busy} onClick={() => act(() => api.post(`/support/tickets/${id}/reopen`, {}), 'support.reopened')}>
              {t('support.reopen')}
            </Button>
          ) : (
            <p className="text-sm text-ink-soft">{t('support.reopenExpired')}</p>
          )}
        </div>
      )}
    </Card>
  )
}

export default function Help() {
  const { t } = useI18n()
  const { data, error, reload } = useApi('/support/tickets')
  const [writing, setWriting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [waiting, setWaiting] = useState([])

  // Requests still on this phone (offline), refreshed whenever the outbox changes
  const readWaiting = useCallback(() => waitingSupport().then(setWaiting), [])
  useEffect(() => {
    readWaiting()
    return subscribe(readWaiting)
  }, [readWaiting])

  function done(result) {
    setWriting(false)
    if (result.status === 'failed') setNotice({ type: 'error', text: `errors.${result.code}` })
    else setNotice({ type: result.status === 'sent' ? 'success' : 'info', text: result.status === 'sent' ? 'support.sent' : 'support.savedOffline' })
    reload()
  }

  const tickets = data?.tickets || []
  const waitingTickets = waiting.filter((w) => w.kind === 'ticket')

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={t('support.helpTitle')}
        actions={
          !writing && (
            <Button icon="mail" onClick={() => setWriting(true)}>
              {t('support.contactAdmin')}
            </Button>
          )
        }
      />
      <p className="text-ink-soft">{t('support.helpIntro')}</p>
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      {writing && <NewRequest onDone={done} onCancel={() => setWriting(false)} />}

      {waitingTickets.length > 0 && (
        <ul className="space-y-2">
          {waitingTickets.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-line bg-surface p-3">
              <span className="font-semibold">{w.data.subject}</span>
              <span className="flex items-center gap-2">
                <Pill tone={w.status === 'failed' ? 'red' : 'amber'} icon={w.status === 'failed' ? 'alert' : 'clock'}>
                  {w.status === 'failed' ? t(`errors.${w.error}`) : t('support.waitingToSend')}
                </Pill>
                {w.status === 'failed' && (
                  <Button variant="ghost" onClick={() => discardSupport(w.id)}>
                    {t('support.discard')}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>{t('support.myMessages')}</SectionTitle>
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && tickets.length === 0 && waitingTickets.length === 0 && <EmptyState title={t('support.empty')} text={t('support.emptyText')} />}
      {tickets.length > 0 && (
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                onClick={() => setOpenId(ticket.id)}
                aria-expanded={openId === ticket.id}
                className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-left hover:bg-canvas"
              >
                <span>
                  <span className="block font-semibold">{ticket.subject}</span>
                  <span className="text-sm text-ink-soft">
                    {t(`support.categories.${ticket.category}`)} · {formatDateTime(ticket.last_message_at)}
                  </span>
                </span>
                <StatusBadge group="supportStatus" status={ticket.status} />
              </button>
              {openId === ticket.id && (
                <div className="mt-2">
                  <TicketDetail id={ticket.id} onClose={() => setOpenId(null)} onChanged={reload} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
