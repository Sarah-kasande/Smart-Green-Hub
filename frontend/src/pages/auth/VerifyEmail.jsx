// "Enter the 6-digit code" after registration (FR02, docs/DEVIATIONS.md W21).
// Reached from registration (email in the address) or from sign-in when the email is not yet confirmed.
import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import api, { errorCode } from '../../api/client'
import { codeErrorText } from '../../utils/codeErrors'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import CodeInput from '../../components/ui/CodeInput'
import ResendButton from '../../components/ui/ResendButton'
import { TextField } from '../../components/ui/Fields'
import { buttonClasses } from '../../components/ui/buttonStyles'
import AuthCard from './AuthCard'

export default function VerifyEmail() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const location = useLocation()
  const [email, setEmail] = useState(params.get('email') || '')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [resent, setResent] = useState(false)
  // Registration tells us whether the email really left the server
  const emailStatus = location.state?.emailStatus

  async function submit(event) {
    event.preventDefault()
    if (code.length !== 6) return setError(t('fieldErrors.invalid_code'))
    setBusy(true)
    setError(null)
    try {
      await api.post('/auth/verify-email', { email, code })
      setDone(true)
    } catch (err) {
      if (errorCode(err) === 'ALREADY_VERIFIED') return setDone(true)
      setError(codeErrorText(t, err))
      if (['TOO_MANY_ATTEMPTS', 'CODE_EXPIRED', 'CODE_INVALID'].includes(errorCode(err))) setCode('')
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    const { data } = await api.post('/auth/resend-verification', { email })
    setResent(true)
    setError(null)
    setCode('')
    return data.resend_after_seconds
  }

  if (done) {
    return (
      <AuthCard title={t('auth.verifiedTitle')}>
        <Notice type="success">{t('auth.verifiedText')}</Notice>
        <Link to="/login" className={`${buttonClasses('primary', true)} mt-6`}>
          {t('common.signIn')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('code.verifyTitle')}>
      <div className="mb-5 flex gap-3">
        <Icon name="mail" size={28} className="shrink-0 text-leaf-text" />
        <p>{email ? t('code.sentTo', { email }) : t('code.enterEmail')}</p>
      </div>
      {emailStatus === 'failed' && <Notice type="warning" className="mb-4">{t('code.sendFailed')}</Notice>}
      {resent && <Notice type="success" className="mb-4">{t('code.resent')}</Notice>}
      <form onSubmit={submit} className="space-y-4" noValidate>
        {!params.get('email') && <TextField label={t('auth.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        <CodeInput value={code} onChange={setCode} error={error} />
        <Button type="submit" full icon="check" disabled={busy || !email}>
          {busy ? t('common.loading') : t('code.confirm')}
        </Button>
      </form>
      <div className="mt-4">{email && <ResendButton onResend={resend} initialSeconds={location.state?.fresh ? 60 : 0} />}</div>
      <p className="mt-4 text-sm text-ink-soft">{t('code.spamHint')}</p>
    </AuthCard>
  )
}
