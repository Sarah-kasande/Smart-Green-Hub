// Small status labels. Each one shows an icon AND a word, never colour alone (CLAUDE.md design rules).
import Icon from './Icon'
import { Badge } from '@/components/shadcn/badge'
import { useI18n } from '../../i18n/I18nProvider'

const TONES = {
  green: 'bg-risk-low text-risk-low-text',
  amber: 'bg-risk-medium text-risk-medium-text',
  red: 'bg-risk-high text-risk-high-text',
  teal: 'bg-teal-light text-teal-text',
  blue: 'bg-info text-ink',
  grey: 'bg-line/60 text-ink-soft',
}

// Built on the shadcn/ui Badge; the tone colours come from the palette (risk / status tokens)
export function Pill({ tone = 'grey', icon, children }) {
  return (
    <Badge variant="outline" className={`gap-1.5 border-transparent px-2.5 py-1 text-sm font-semibold [&>svg]:size-4 ${TONES[tone]}`}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </Badge>
  )
}

// Low / Medium / High surplus risk
const RISK = { low: { tone: 'green', icon: 'check' }, medium: { tone: 'amber', icon: 'alert' }, high: { tone: 'red', icon: 'alert' } }
export function RiskBadge({ level }) {
  const { t } = useI18n()
  const style = RISK[level] || RISK.low
  return (
    <Pill tone={style.tone} icon={style.icon}>
      {t(`risk.${level}`)}
    </Pill>
  )
}

// Statuses of batches, alerts, listings and requests (translated with the given group)
const STATUS_STYLE = {
  // batch stages
  seedling: ['teal', 'sprout'],
  growing: ['teal', 'sprout'],
  ready: ['green', 'check'],
  overgrown: ['red', 'alert'],
  cleared: ['grey', 'close'],
  // alerts
  open: ['amber', 'bell'],
  acknowledged: ['blue', 'info'],
  resolved: ['green', 'check'],
  dismissed: ['grey', 'close'],
  // listings
  active: ['green', 'board'],
  reserved: ['amber', 'clock'],
  fulfilled: ['green', 'check'],
  expired: ['grey', 'clock'],
  withdrawn: ['grey', 'close'],
  // requests
  pending: ['amber', 'clock'],
  approved: ['teal', 'check'],
  declined: ['red', 'close'],
  cancelled: ['grey', 'close'],
}

export function StatusBadge({ group, status }) {
  const { t } = useI18n()
  const [tone, icon] = STATUS_STYLE[status] || ['grey', 'info']
  return (
    <Pill tone={tone} icon={icon}>
      {t(`${group}.${status}`)}
    </Pill>
  )
}
