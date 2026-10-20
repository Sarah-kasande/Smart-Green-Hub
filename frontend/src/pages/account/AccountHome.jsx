// Home page for nursery operators and institutions in Phase 1: account check status,
// editable details and supporting documents. Phase 2 (operator) and Phase 4 (institution)
// add the real dashboards above this.
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Icon from '../../components/ui/Icon'
import Notice from '../../components/ui/Notice'
import VerificationBadge from '../../components/ui/VerificationBadge'
import OrganisationForm from './OrganisationForm'
import Documents from './Documents'

export default function AccountHome() {
  const { t } = useI18n()
  const { user, organisation, refresh } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  // Arrived straight from the code screen: confirm and explain the next step
  const justVerified = useLocation().state?.justVerified

  if (!organisation) return null
  const status = organisation.verification_status

  async function onSaved() {
    await refresh()
    setEditing(false)
    setSaved(true)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-leaf-text">{t(`roles.${user.role}`)}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{t('account.welcome', { name: user.full_name })}</h1>
        <p className="mt-1 flex items-start gap-2 text-ink-soft">
          <Icon name={organisation.type === 'nursery' ? 'sprout' : 'building'} size={18} className="mt-0.5" />
          {organisation.name} · {t(`districts.${organisation.district}`)}, {organisation.sector}
        </p>
      </div>

      {justVerified && (
        <Notice type="success">
          <p className="font-semibold">{t('code.verifiedTitle')}</p>
          <p>{status === 'approved' ? t('account.approvedText') : t('code.nextStep')}</p>
        </Notice>
      )}
      {saved && <Notice type="success">{t('account.detailsSaved')}</Notice>}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t('account.statusTitle')}</h2>
          <VerificationBadge status={status} />
        </div>
        <div className="mt-3">
          {status === 'pending' && <p className="text-ink-soft">{t('account.pendingText')}</p>}
          {status === 'approved' && <p className="text-ink-soft">{t('account.approvedText')}</p>}
          {status === 'rejected' && (
            <Notice type="warning">
              <p>{t('account.rejectedText')}</p>
              <p className="mt-1 font-semibold">“{organisation.review_note}”</p>
            </Notice>
          )}
        </div>
        <div className="mt-4">
          {editing ? (
            <OrganisationForm organisation={organisation} onSaved={onSaved} onCancel={() => setEditing(false)} />
          ) : (
            <Button variant={status === 'rejected' ? 'primary' : 'secondary'} icon="edit" onClick={() => { setSaved(false); setEditing(true) }}>
              {t('account.editDetails')}
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">{t('account.documentsTitle')}</h2>
        <Documents />
      </Card>

      <Card className="bg-info">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Icon name="info" />
          {t('account.nextSteps')}
        </h2>
        <p className="mt-2 text-ink-soft">{user.role === 'operator' ? t('account.nextOperator') : t('account.nextInstitution')}</p>
      </Card>
    </div>
  )
}
