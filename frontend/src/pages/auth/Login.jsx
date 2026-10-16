import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import api, { errorCode, fieldErrors } from '../../api/client'
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
  const [resent, setResent] = useState(false)

  if (user) return <Navigate to={homePathFor(user.role)} replace />

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFields({})
    setResent(false)
    try {
      const data = await login(email, password)
      // Go back to the page the user wanted, if it belongs to their role
      const from = location.state?.from
      const home = homePathFor(data.user.role)
      navigate(from && from.startsWith(home) ? from : home, { replace: true })
    } catch (err) {
      setError(errorCode(err))
      setFields(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    await api.post('/auth/resend-verification', { email }).catch(() => {})
    setResent(true)
  }

  return (
    <AuthCard title={t('auth.loginTitle')} intro={t('auth.loginIntro')}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && error !== 'VALIDATION_FAILED' && (
          <Notice type="error">
            {error === 'EMAIL_NOT_VERIFIED' ? t('auth.notVerified') : t(`errors.${error}`)}
            {error === 'EMAIL_NOT_VERIFIED' && !resent && (
              <button type="button" onClick={resend} className="mt-2 block min-h-10 font-semibold underline">
                {t('auth.resend')}
              </button>
            )}
          </Notice>
        )}
        {resent && <Notice type="success">{t('auth.resent')}</Notice>}
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
          <Link to="/forgot-password" className="inline-flex min-h-10 items-center font-semibold text-teal underline">
            {t('auth.forgot')}
          </Link>
        </div>
        <Button type="submit" full icon="arrowRight" disabled={busy}>
          {busy ? t('common.loading') : t('common.signIn')}
        </Button>
      </form>
      <p className="mt-6 text-center text-ink-soft">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-semibold text-teal underline">
          {t('common.register')}
        </Link>
      </p>
    </AuthCard>
  )
}
