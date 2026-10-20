// Registration for nursery operators and receiving institutions (FR02).
// Administrators are never created here.
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import { SelectField, TextField } from '../../components/ui/Fields'
import { DISTRICTS, ORG_TYPES } from '../../utils/options'
import AuthCard from './AuthCard'

function RoleOption({ value, current, onChange, icon, title, hint }) {
  const selected = value === current
  return (
    <label
      className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${
        selected ? 'border-leaf bg-leaf-light/50' : 'border-line bg-surface hover:bg-canvas'
      }`}
    >
      <input type="radio" name="role" value={value} checked={selected} onChange={() => onChange(value)} className="mt-1 h-5 w-5 accent-leaf" />
      <Icon name={icon} className="mt-0.5 text-leaf-text" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-soft">{hint}</span>
      </span>
    </label>
  )
}

export default function Register() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [role, setRole] = useState(params.get('role') === 'institution' ? 'institution' : 'operator')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    name: '',
    org_type: '',
    district: '',
    sector: '',
    address_text: '',
    contact_phone: '',
    is_listed: false,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})
    const payload = {
      role,
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      preferred_language: lang,
    }
    if (role === 'operator') {
      payload.nursery = { name: form.name, district: form.district, sector: form.sector, address_text: form.address_text, is_listed: form.is_listed }
    } else {
      payload.institution = { org_name: form.name, org_type: form.org_type, district: form.district, sector: form.sector, contact_phone: form.contact_phone }
    }
    try {
      const { data } = await api.post('/auth/register', payload)
      // Next step: enter the 6-digit code from the email
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`, { state: { emailStatus: data.email_status, fresh: true } })
    } catch (err) {
      setError(errorCode(err))
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  // The API reports nested fields as "nursery.name" or "institution.org_name"
  const orgField = (key) => (role === 'operator' ? fields[`nursery.${key}`] : fields[`institution.${key === 'name' ? 'org_name' : key}`])

  return (
    <AuthCard title={t('auth.registerTitle')} intro={t('auth.registerIntro')} wide>
      <form onSubmit={submit} className="space-y-6" noValidate>
        {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}

        <fieldset>
          <legend className="text-sm font-semibold">{t('auth.iAm')}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <RoleOption value="operator" current={role} onChange={setRole} icon="sprout" title={t('auth.roleOperator')} hint={t('auth.roleOperatorHint')} />
            <RoleOption value="institution" current={role} onChange={setRole} icon="building" title={t('auth.roleInstitution')} hint={t('auth.roleInstitutionHint')} />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-bold">{t('auth.yourDetails')}</legend>
          <TextField label={t('auth.fullName')} autoComplete="name" value={form.full_name} onChange={set('full_name')} error={fields.full_name} required />
          <TextField label={t('auth.email')} type="email" autoComplete="email" value={form.email} onChange={set('email')} error={fields.email} required />
          <TextField label={t('auth.phone')} type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={fields.phone} optional placeholder="+250 7XX XXX XXX" />
          <TextField
            label={t('auth.password')}
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={fields.password}
            hint={t('auth.passwordHint')}
            required
          />
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-bold">{role === 'operator' ? t('auth.nurseryDetails') : t('auth.institutionDetails')}</legend>
          <TextField label={role === 'operator' ? t('auth.nurseryName') : t('auth.orgName')} value={form.name} onChange={set('name')} error={orgField('name')} required />
          {role === 'institution' && (
            <SelectField
              label={t('auth.orgType')}
              value={form.org_type}
              onChange={set('org_type')}
              error={orgField('org_type')}
              placeholder={t('auth.choose')}
              options={ORG_TYPES.map((v) => ({ value: v, label: t(`orgTypes.${v}`) }))}
              required
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label={t('auth.district')}
              value={form.district}
              onChange={set('district')}
              error={orgField('district')}
              placeholder={t('auth.choose')}
              options={DISTRICTS.map((v) => ({ value: v, label: t(`districts.${v}`) }))}
              required
            />
            <TextField label={t('auth.sector')} value={form.sector} onChange={set('sector')} error={orgField('sector')} required />
          </div>
          {role === 'operator' ? (
            <>
              <TextField label={t('auth.address')} value={form.address_text} onChange={set('address_text')} error={orgField('address_text')} optional />
              <label className="flex min-h-12 items-start gap-3 rounded-xl bg-canvas p-3">
                <input type="checkbox" checked={form.is_listed} onChange={set('is_listed')} className="mt-1 h-5 w-5 accent-leaf" />
                <span>{t('auth.listConsent')}</span>
              </label>
            </>
          ) : (
            <TextField label={t('auth.contactPhone')} type="tel" value={form.contact_phone} onChange={set('contact_phone')} error={orgField('contact_phone')} optional />
          )}
        </fieldset>

        <Button type="submit" full icon="check" disabled={busy}>
          {busy ? t('common.loading') : t('auth.createAccount')}
        </Button>
      </form>
      <p className="mt-6 text-center text-ink-soft">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-teal-text underline">
          {t('common.signIn')}
        </Link>
      </p>
    </AuthCard>
  )
}
