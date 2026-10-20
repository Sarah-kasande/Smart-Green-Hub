// Step 1 of the password reset (FR17): ask for a 6-digit code by email.
// The answer is the same whether or not the email is registered, so the next screen is always shown.
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import { TextField } from '../../components/ui/Fields'
import AuthCard from './AuthCard'

export default function ForgotPassword() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})
    try {
      await api.post('/auth/forgot-password', { email })
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`, { state: { fresh: true } })
    } catch (err) {
      setError(errorCode(err))
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title={t('auth.forgotTitle')} intro={t('code.forgotIntro')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && error !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error}`)}</Notice>}
        <TextField label={t('auth.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
        <Button type="submit" full icon="mail" disabled={busy}>
          {busy ? t('common.loading') : t('code.sendCode')}
        </Button>
      </form>
      <Link to="/login" className="mt-6 block text-center font-semibold text-teal-text underline">
        {t('common.signIn')}
      </Link>
    </AuthCard>
  )
}
