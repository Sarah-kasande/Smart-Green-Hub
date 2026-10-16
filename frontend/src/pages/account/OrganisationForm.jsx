// Edit nursery / institution details. If the administrator asked for a correction,
// saving sends the details back for review.
import { useState } from 'react'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import { SelectField, TextField } from '../../components/ui/Fields'
import { DISTRICTS, ORG_TYPES } from '../../utils/options'

export default function OrganisationForm({ organisation, onSaved, onCancel }) {
  const { t } = useI18n()
  const isNursery = organisation.type === 'nursery'
  const [form, setForm] = useState({
    name: organisation.name || '',
    org_type: organisation.org_type || '',
    district: organisation.district || '',
    sector: organisation.sector || '',
    address_text: organisation.address_text || '',
    contact_phone: organisation.contact_phone || '',
    is_listed: Boolean(organisation.is_listed),
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
    const payload = isNursery
      ? { name: form.name, district: form.district, sector: form.sector, address_text: form.address_text, is_listed: form.is_listed }
      : { name: form.name, org_type: form.org_type, district: form.district, sector: form.sector, contact_phone: form.contact_phone }
    try {
      await api.put('/me/organisation', payload)
      await onSaved()
    } catch (err) {
      setError(errorCode(err))
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      <TextField label={isNursery ? t('auth.nurseryName') : t('auth.orgName')} value={form.name} onChange={set('name')} error={fields.name} required />
      {!isNursery && (
        <SelectField
          label={t('auth.orgType')}
          value={form.org_type}
          onChange={set('org_type')}
          error={fields.org_type}
          options={ORG_TYPES.map((v) => ({ value: v, label: t(`orgTypes.${v}`) }))}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t('auth.district')}
          value={form.district}
          onChange={set('district')}
          error={fields.district}
          placeholder={t('auth.choose')}
          options={DISTRICTS.map((v) => ({ value: v, label: t(`districts.${v}`) }))}
        />
        <TextField label={t('auth.sector')} value={form.sector} onChange={set('sector')} error={fields.sector} required />
      </div>
      {isNursery ? (
        <>
          <TextField label={t('auth.address')} value={form.address_text} onChange={set('address_text')} error={fields.address_text} optional />
          <label className="flex min-h-12 items-start gap-3 rounded-xl bg-canvas p-3">
            <input type="checkbox" checked={form.is_listed} onChange={set('is_listed')} className="mt-1 h-5 w-5 accent-leaf" />
            <span>{t('auth.listConsent')}</span>
          </label>
        </>
      ) : (
        <TextField label={t('auth.contactPhone')} type="tel" value={form.contact_phone} onChange={set('contact_phone')} error={fields.contact_phone} optional />
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? t('common.saving') : organisation.verification_status === 'rejected' ? t('account.resubmit') : t('common.save')}
        </Button>
        <Button variant="secondary" icon="close" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
