// Account settings: name, phone and language (FR18). Used by every role.
import { useState } from 'react'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import { SelectField, TextField } from '../../components/ui/Fields'

export default function Settings() {
  const { t, setLang } = useI18n()
  const { user, refresh } = useAuth()
  const [form, setForm] = useState({ full_name: user.full_name, phone: user.phone || '', preferred_language: user.preferred_language })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [fields, setFields] = useState({})

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    setFields({})
    try {
      await api.patch('/me', form)
      setLang(form.preferred_language)
      await refresh()
      setMessage({ type: 'success', text: t('settings.saved') })
    } catch (err) {
      setMessage({ type: 'error', text: t(`errors.${errorCode(err)}`) })
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">{t('settings.title')}</h1>
      <Card>
        <h2 className="mb-4 text-lg font-bold">{t('settings.profile')}</h2>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {message && <Notice type={message.type}>{message.text}</Notice>}
          <TextField label={t('auth.email')} value={user.email} disabled />
          <TextField label={t('auth.fullName')} value={form.full_name} onChange={set('full_name')} error={fields.full_name} required />
          <TextField label={t('auth.phone')} type="tel" value={form.phone} onChange={set('phone')} error={fields.phone} optional />
          <SelectField
            label={t('common.language')}
            hint={t('settings.languageHint')}
            value={form.preferred_language}
            onChange={set('preferred_language')}
            options={[
              { value: 'en', label: 'English' },
              { value: 'rw', label: 'Kinyarwanda' },
            ]}
          />
          <Button type="submit" icon="check" disabled={busy}>
            {busy ? t('common.saving') : t('common.save')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
