// Warns the administrator when the app (Vercel) and the API (Render) were built from different
// git commits, e.g. the frontend was deployed but the API was not redeployed yet. In that case new
// pages fail with "The server does not know this request". Shown only when both versions are known.
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Notice from './Notice'

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'local'

export default function VersionCheck() {
  const { t } = useI18n()
  const { data } = useApi('/health')
  const server = data?.version
  if (!server || server === 'local' || APP_VERSION === 'local' || server === APP_VERSION) return null
  return (
    <Notice type="warning" className="mb-4">
      {t('version.mismatch', { server, app: APP_VERSION })}
    </Notice>
  )
}
