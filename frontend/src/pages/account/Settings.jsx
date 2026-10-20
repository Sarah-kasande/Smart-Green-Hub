// Settings for every role: profile and language (FR18), appearance (light / dark mode),
// and for nurseries and institutions the organisation details, map pin and documents.
import { useState } from 'react'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import { useTheme } from '../../theme/ThemeProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import VerificationBadge from '../../components/ui/VerificationBadge'
import { SelectField, TextField } from '../../components/ui/Fields'
import OrganisationForm from './OrganisationForm'
import Documents from './Documents'

function Appearance() {
  const { t } = useI18n()
  const { choice, setChoice } = useTheme()
  const options = [
    { value: 'light', icon: 'sun', label: t('theme.light') },
    { value: 'dark', icon: 'moon', label: t('theme.dark') },
    { value: 'system', icon: 'phone', label: t('theme.system') },
  ]
  return (
    <Card>
      <h2 className="text-lg font-bold">{t('theme.title')}</h2>
      <p className="mb-4 text-sm text-ink-soft">{t('theme.hint')}</p>
      <fieldset>
        <legend className="sr-only">{t('theme.title')}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((o) => (
            <label
              key={o.value}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 font-semibold ${
                choice === o.value ? 'border-leaf bg-leaf-light/50' : 'border-line hover:bg-canvas'
              }`}
            >
              <input type="radio" name="theme" value={o.value} checked={choice === o.value} onChange={() => setChoice(o.value)} className="h-5 w-5 accent-leaf" />
              <Icon name={o.icon} />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    </Card>
  )
}

function Profile() {
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
  )
}

function Organisation() {
  const { t } = useI18n()
  const { organisation, refresh } = useAuth()
  const [saved, setSaved] = useState(false)
  return (
    <>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">{organisation.type === 'nursery' ? t('auth.nurseryDetails') : t('auth.institutionDetails')}</h2>
          <VerificationBadge status={organisation.verification_status} />
        </div>
        {organisation.verification_status === 'rejected' && (
          <Notice type="warning" className="mb-4">
            {t('account.rejectedText')} “{organisation.review_note}”
          </Notice>
        )}
        {saved && (
          <Notice type="success" className="mb-4">
            {t('account.detailsSaved')}
          </Notice>
        )}
        <OrganisationForm
          key={`${organisation.verification_status}-${organisation.latitude}`}
          organisation={organisation}
          onSaved={async () => {
            await refresh()
            setSaved(true)
          }}
          onCancel={() => setSaved(false)}
        />
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-bold">{t('account.documentsTitle')}</h2>
        <Documents />
      </Card>
    </>
  )
}

export default function Settings() {
  const { t } = useI18n()
  const { organisation } = useAuth()
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold sm:text-3xl">{t('settings.title')}</h1>
      <Profile />
      <Appearance />
      {organisation && <Organisation />}
    </div>
  )
}
