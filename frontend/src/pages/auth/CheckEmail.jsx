import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import AuthCard from './AuthCard'

export default function CheckEmail() {
  const { t } = useI18n()
  const email = useLocation().state?.email || ''
  const [resent, setResent] = useState(false)

  async function resend() {
    await api.post('/auth/resend-verification', { email }).catch(() => {})
    setResent(true)
  }

  return (
    <AuthCard title={t('auth.checkEmailTitle')}>
      <div className="flex gap-3">
        <Icon name="mail" size={28} className="text-leaf-text" />
        <p>{t('auth.checkEmailText', { email: email || '…' })}</p>
      </div>
      <div className="mt-6 space-y-3">
        {resent ? (
          <Notice type="success">{t('auth.resent')}</Notice>
        ) : (
          email && (
            <Button variant="secondary" full icon="mail" onClick={resend}>
              {t('auth.resend')}
            </Button>
          )
        )}
        <Link to="/login" className="block text-center font-semibold text-teal-text underline">
          {t('common.signIn')}
        </Link>
      </div>
    </AuthCard>
  )
}
