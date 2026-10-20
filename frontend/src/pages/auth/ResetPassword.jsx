// Step 2 of the password reset (FR17): the 6-digit code from the email and the new password.
// A successful reset signs the account out on every device.
import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import CodeInput from '../../components/ui/CodeInput'
import ResendButton from '../../components/ui/ResendButton'
import { TextField } from '../../components/ui/Fields'
import { buttonClasses } from '../../components/ui/buttonStyles'
import { codeErrorText } from '../../utils/codeErrors'
import AuthCard from './AuthCard'

export default function ResetPassword() {
  const { t } = useI18n()
  const { refresh } = useAuth()
  const [params] = useSearchParams()
  const location = useLocation()
  const [email, setEmail] = useState(params.get('email') || '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [codeError, setCodeError] = useState(null)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})
  const [resent, setResent] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setCodeError(null)
    setFields({})
    if (code.length !== 6) return setCodeError(t('fieldErrors.invalid_code'))
    if (password !== confirm) return setError(t('auth.passwordsDiffer'))
    setBusy(true)
    try {
      await api.post('/auth/reset-password', { email, code, password })
      setDone(true)
      // Every session was ended on the server; update this screen too.
      await refresh().catch(() => {})
    } catch (err) {
      const apiCode = errorCode(err)
      const f = fieldErrors(err)
      if (apiCode === 'VALIDATION_FAILED' && !f.code) setFields(f)
      else setCodeError(codeErrorText(t, err))
      if (['TOO_MANY_ATTEMPTS', 'CODE_EXPIRED', 'CODE_INVALID'].includes(apiCode)) setCode('')
    } finally {
      setBusy(false)
    }
  }

  // Returns the seconds to wait before the next "send again" (one code per 60 s per account)
  async function resend() {
    setCodeError(null)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setResent(true)
      setCode('')
      return data.resend_after_seconds
    } catch (err) {
      setResent(false)
      setCodeError(t(`errors.${errorCode(err)}`))
      return 60
    }
  }

  if (done) {
    return (
      <AuthCard title={t('auth.resetTitle')}>
        <Notice type="success">{t('auth.resetDone')}</Notice>
        <Link to="/login" className={`${buttonClasses('primary', true)} mt-6`}>
          {t('common.signIn')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth.resetTitle')}>
      <div className="mb-5 flex gap-3">
        <Icon name="mail" size={28} className="shrink-0 text-leaf-text" />
        <div>
          <p>{params.get('email') ? t('code.resetSentTo', { email: params.get('email') }) : t('code.enterEmail')}</p>
          <Link to="/forgot-password" className="mt-1 inline-flex min-h-10 items-center font-semibold text-teal-text underline">
            {t('code.differentEmail')}
          </Link>
        </div>
      </div>
      {resent && <Notice type="success" className="mb-4">{t('code.resent')}</Notice>}
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Notice type="error">{error}</Notice>}
        {!params.get('email') && <TextField label={t('auth.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        <CodeInput value={code} onChange={setCode} error={codeError} />
        <TextField
          label={t('auth.newPassword')}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fields.password}
          hint={t('auth.passwordHint')}
          required
        />
        <TextField label={t('auth.confirmPassword')} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <Button type="submit" full icon="check" disabled={busy || !email}>
          {busy ? t('common.saving') : t('auth.setPassword')}
        </Button>
      </form>
      <div className="mt-4">{email && <ResendButton onResend={resend} initialSeconds={location.state?.fresh ? 60 : 0} />}</div>
      <p className="mt-4 text-sm text-ink-soft">{t('code.spamHint')}</p>
    </AuthCard>
  )
}
