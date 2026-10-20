// A message box with an icon. Errors are announced to screen readers immediately (role="alert").
import Icon from './Icon'

const STYLES = {
  info: { box: 'bg-info text-ink border-ink/10', icon: 'info' },
  success: { box: 'bg-leaf-light text-leaf-text border-leaf/20', icon: 'check' },
  warning: { box: 'bg-risk-medium text-risk-medium-text border-risk-medium-text/20', icon: 'alert' },
  error: { box: 'bg-risk-high text-risk-high-text border-risk-high-text/20', icon: 'alert' },
}

export default function Notice({ type = 'info', children, className = '' }) {
  const style = STYLES[type]
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border p-3 text-sm ${style.box} ${className}`}>
      <Icon name={style.icon} className="mt-0.5" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
