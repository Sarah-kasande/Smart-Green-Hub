import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { errorCode, fieldErrors } from '../../api/client'
import { homePathFor, useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import { TextField } from '../../components/ui/Fields'
import AuthCard from './AuthCard'

export default function Login() {
  const { t } = useI18n()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})

  if (user) return <Navigate to={homePathFor(user.role)} replace />

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})
    try {
      const data = await login(email, password)
      // Go back to the page the user wanted, if it belongs to their role
      const from = location.state?.from
      const home = homePathFor(data.user.role)
      navigate(from && from.startsWith(home) ? from : home, { replace: true })
    } catch (err) {
      // Right password but the email is not confirmed yet: go to the code screen, where a new code
      // can be requested. (This answer only comes after a correct password, so it reveals nothing
      // to someone guessing accounts.)
      if (errorCode(err) === 'EMAIL_NOT_VERIFIED') {
        navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`, { state: { fromLogin: true } })
        return
      }
      setError(errorCode(err))
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title={t('auth.loginTitle')} intro={t('auth.loginIntro')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {location.state?.verified && !error && <Notice type="success">{t('code.verifiedSignIn')}</Notice>}
        {error && error !== 'VALIDATION_FAILED' && <Notice type="error">{t(`errors.${error}`)}</Notice>}
        <TextField label={t('auth.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} required />
        <TextField
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fields.password}
          required
        />
        <div className="text-right">
          <Link to="/forgot-password" className="inline-flex min-h-10 items-center font-semibold text-teal-text underline">
            {t('auth.forgot')}
          </Link>
        </div>
        <Button type="submit" full icon="arrowRight" disabled={busy}>
          {busy ? t('common.loading') : t('common.signIn')}
        </Button>
      </form>
      <p className="mt-6 text-center text-ink-soft">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-teal-text underline">
          {t('common.register')}
        </Link>
      </p>
    </AuthCard>
  )
}
