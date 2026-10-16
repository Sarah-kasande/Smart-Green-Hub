// Shows Online / Offline. In Phase 2 this becomes the full sync chip ("N waiting to sync").
import { useEffect, useState } from 'react'
import Icon from './Icon'
import { useI18n } from '../../i18n/I18nProvider'

export default function ConnectionChip() {
  const { t } = useI18n()
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
        online ? 'bg-leaf-light text-leaf-dark' : 'bg-risk-medium text-risk-medium-text'
      }`}
    >
      <Icon name={online ? 'wifi' : 'wifiOff'} size={16} />
      {online ? t('connection.online') : t('connection.offline')}
    </span>
  )
}
