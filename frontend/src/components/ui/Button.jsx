// A button always shows text; an icon is optional.
import Icon from './Icon'
import { buttonClasses } from './buttonStyles'

export default function Button({ variant = 'primary', icon, full = false, type = 'button', children, className = '', ...props }) {
  return (
    <button type={type} className={`${buttonClasses(variant, full)} ${className}`} {...props}>
      {icon && <Icon name={icon} />}
      <span>{children}</span>
    </button>
  )
}
