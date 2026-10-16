import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { errorCode } from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import { buttonClasses } from '../../components/ui/buttonStyles'
import Notice from '../../components/ui/Notice'
import PageLoader from '../../components/ui/PageLoader'
import AuthCard from './AuthCard'

export default function VerifyEmail() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [result, setResult] = useState({ status: 'working' })
  // The link works only once. React's development mode runs effects twice, so remember
  // that we already sent it instead of using the link a second time.
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    api
      .post('/auth/verify-email', { token })
      .then(() => setResult({ status: 'done' }))
      .catch((err) => setResult({ status: 'failed', code: errorCode(err) === 'VALIDATION_FAILED' ? 'INVALID_OR_EXPIRED_LINK' : errorCode(err) }))
  }, [token])

  if (result.status === 'working') {
    return (
      <AuthCard title={t('auth.verifyingTitle')}>
        <PageLoader />
      </AuthCard>
    )
  }

  if (result.status === 'failed') {
    return (
      <AuthCard title={t('auth.verifyFailedTitle')}>
        <Notice type="error">{t(`errors.${result.code}`)}</Notice>
        <Link to="/login" className={`${buttonClasses('primary', true)} mt-6`}>
          {t('common.signIn')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth.verifiedTitle')}>
      <Notice type="success">{t('auth.verifiedText')}</Notice>
      <Link to="/login" className={`${buttonClasses('primary', true)} mt-6`}>
        {t('common.signIn')}
      </Link>
    </AuthCard>
  )
}
