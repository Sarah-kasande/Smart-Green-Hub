// Public contact form (docs/DEVIATIONS.md W51) for people who are not signed in: for example they cannot
// sign in, or their account waits for approval. No account needed: name, email and message.
// Spam protection: the server limits how many messages one address can send, and a hidden "website"
// field (a honeypot) that people never see; a robot that fills it is quietly ignored.
import { useState } from 'react'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import { TextArea, TextField } from '../ui/Fields'

export default function ContactForm() {
  const { t } = useI18n()
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null) // null | 'sent' | error code
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(event) {
    event.preventDefault()
    const missing = {}
    if (!form.name.trim()) missing.name = 'required'
    if (!form.email.trim()) missing.email = 'required'
    if (form.message.trim().length < 10) missing.message = 'too_short'
    setErrors(missing)
    if (Object.keys(missing).length) return
    setBusy(true)
    setStatus(null)
    try {
      await api.post('/public/contact', { name: form.name.trim(), email: form.email.trim(), message: form.message.trim(), website: form.website })
      setStatus('sent')
      setForm({ name: '', email: '', message: '', website: '' })
    } catch (err) {
      setStatus(errorCode(err))
      setErrors(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  if (status === 'sent') return <Notice type="success">{t('contact.sent')}</Notice>
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {status && status !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${status}`)}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label={t('contact.name')} value={form.name} onChange={set('name')} maxLength={120} autoComplete="name" error={errors.name} />
        <TextField label={t('auth.email')} type="email" value={form.email} onChange={set('email')} maxLength={190} autoComplete="email" error={errors.email} />
      </div>
      <TextArea label={t('contact.message')} value={form.message} onChange={set('message')} maxLength={4000} error={errors.message} />
      {/* Honeypot: hidden from people and screen readers; only robots fill it */}
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
        </label>
      </div>
      <p className="text-sm text-ink-soft">{t('contact.privacy')}</p>
      <Button type="submit" icon="mail" disabled={busy}>
        {t('contact.send')}
      </Button>
    </form>
  )
}
