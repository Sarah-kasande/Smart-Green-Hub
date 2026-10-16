import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { errorCode, fieldErrors } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import { buttonClasses } from '../../components/ui/buttonStyles'
import Notice from '../../components/ui/Notice'
import { TextField } from '../../components/ui/Fields'
import AuthCard from './AuthCard'

export default function ResetPassword() {
  const { t } = useI18n()
  const { refresh } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [fields, setFields] = useState({})

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setFields({})
    if (password !== confirm) {
      setError('PASSWORDS_DIFFER')
      return
    }
    setBusy(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
      // Every session was ended on the server; update this screen too.
      await refresh().catch(() => {})
    } catch (err) {
      const code = errorCode(err)
      const f = fieldErrors(err)
      setError(code === 'VALIDATION_FAILED' && f.token ? 'INVALID_OR_EXPIRED_LINK' : code)
      setFields(f)
    } finally {
      setBusy(false)
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
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && error !== 'VALIDATION_FAILED' && (
          <Notice type="error">
            {error === 'PASSWORDS_DIFFER' ? t('auth.passwordsDiffer') : t(`errors.${error}`)}
            {error === 'INVALID_OR_EXPIRED_LINK' && (
              <Link to="/forgot-password" className="mt-2 block font-semibold underline">
                {t('auth.sendLink')}
              </Link>
            )}
          </Notice>
        )}
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
        <Button type="submit" full icon="check" disabled={busy}>
          {busy ? t('common.saving') : t('auth.setPassword')}
        </Button>
      </form>
    </AuthCard>
  )
}
