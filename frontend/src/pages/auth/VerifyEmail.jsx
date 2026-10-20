// "Verify your email" with the 6-digit code (FR02, docs/DEVIATIONS.md W21, W24).
// Reached after registration, or from Sign in when the email is not confirmed yet.
// A correct code confirms the email, signs the person in and opens their home page, which shows the
// next step (an administrator checks the account).
import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import api, { errorCode } from '../../api/client'
import { homePathFor, useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import CodeInput from '../../components/ui/CodeInput'
import ResendButton from '../../components/ui/ResendButton'
import { TextField } from '../../components/ui/Fields'
import { codeErrorText } from '../../utils/codeErrors'
import AuthCard from './AuthCard'

export default function VerifyEmail() {
  const { t } = useI18n()
  const { refresh } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const location = useLocation()
  const emailFromLink = params.get('email') || ''
  const [email, setEmail] = useState(emailFromLink)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  // Registration tells us whether the email really left the server
  const emailStatus = location.state?.emailStatus
  const fromLogin = location.state?.fromLogin

  async function submit(event) {
    event.preventDefault()
    if (!email.trim()) return setError(t('fieldErrors.invalid_email'))
    if (code.length !== 6) return setError(t('fieldErrors.invalid_code'))
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post('/auth/verify-email', { email: email.trim(), code })
      if (data.signed_in) {
        await refresh()
        navigate(homePathFor(data.user.role), { replace: true, state: { justVerified: true } })
      } else {
        navigate('/login', { replace: true, state: { verified: true } })
      }
    } catch (err) {
      const apiCode = errorCode(err)
      if (apiCode === 'ALREADY_VERIFIED') return navigate('/login', { replace: true, state: { verified: true } })
      setError(codeErrorText(t, err))
      if (['TOO_MANY_ATTEMPTS', 'CODE_EXPIRED', 'CODE_INVALID'].includes(apiCode)) setCode('')
    } finally {
      setBusy(false)
    }
  }

  // Returns the seconds to wait before the next "send again" (the server allows one code per 60 s)
  async function resend() {
    setError(null)
    try {
      const { data } = await api.post('/auth/resend-verification', { email: email.trim() })
      setInfo(t('code.resent'))
      setCode('')
      return data.resend_after_seconds
    } catch (err) {
      setInfo(null)
      setError(t(`errors.${errorCode(err)}`))
      return 60
    }
  }

  return (
    <AuthCard title={t('code.verifyTitle')}>
      <div className="mb-5 flex gap-3">
        <Icon name="mail" size={28} className="shrink-0 text-leaf-text" />
        <div>
          <p>{emailFromLink ? t('code.sentTo', { email: emailFromLink }) : t('code.enterEmail')}</p>
          {emailFromLink && (
            <Link to="/verify-email" replace className="mt-1 inline-flex min-h-10 items-center font-semibold text-teal-text underline">
              {t('code.differentEmail')}
            </Link>
          )}
        </div>
      </div>
      {fromLogin && !info && <Notice type="info" className="mb-4">{t('code.fromLogin')}</Notice>}
      {emailStatus === 'failed' && <Notice type="warning" className="mb-4">{t('code.sendFailed')}</Notice>}
      {info && <Notice type="success" className="mb-4">{info}</Notice>}
      <form onSubmit={submit} className="space-y-4" noValidate>
        {!emailFromLink && <TextField label={t('auth.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        <CodeInput value={code} onChange={setCode} error={error} />
        <Button type="submit" full icon="check" disabled={busy}>
          {busy ? t('common.loading') : t('code.verify')}
        </Button>
      </form>
      {/* Coming from registration a code was just sent: wait 60 s. From sign-in: can ask straight away. */}
      <div className="mt-4">{email.trim() && <ResendButton onResend={resend} initialSeconds={location.state?.fresh ? 60 : 0} />}</div>
      <p className="mt-4 text-sm text-ink-soft">{t('code.spamHint')}</p>
      <Link to="/login" className="mt-4 block text-center font-semibold text-teal-text underline">
        {t('common.signIn')}
      </Link>
    </AuthCard>
  )
}
