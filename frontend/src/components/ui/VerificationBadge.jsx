// Verification status as icon + word (never colour alone).
import Icon from './Icon'
import { useI18n } from '../../i18n/I18nProvider'

const STYLES = {
  pending: { className: 'bg-risk-medium text-risk-medium-text', icon: 'clock' },
  approved: { className: 'bg-leaf-light text-leaf-dark', icon: 'check' },
  rejected: { className: 'bg-risk-high text-risk-high-text', icon: 'alert' },
}

export default function VerificationBadge({ status }) {
  const { t } = useI18n()
  const style = STYLES[status] || STYLES.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${style.className}`}>
      <Icon name={style.icon} size={16} />
      {t(`verification.${status}`)}
    </span>
  )
}
