// The conversation of a help request (docs/DEVIATIONS.md W51), used by Help (users) and Support
// (administrator). Messages from the administrator are marked; internal notes (administrator only) are
// marked "Internal note" and never reach users (the server leaves them out). A screenshot opens through
// the protected uploads route, for its owner and administrators only.
import api from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import { Pill } from '../ui/Badges'
import { formatDateTime } from '../../utils/format'

const fileUrl = (id) => `${api.defaults.baseURL}/uploads/${id}`

export default function Thread({ messages, requesterName }) {
  const { t } = useI18n()
  return (
    <ol className="space-y-3" aria-label={t('support.conversation')}>
      {messages.map((m) => (
        <li
          key={m.id}
          className={`rounded-xl border p-3 ${m.internal ? 'border-dashed border-line bg-canvas' : m.from_admin ? 'border-line bg-info' : 'border-line bg-surface'}`}
        >
          <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{m.from_admin ? t('support.fromAdmin') : m.author?.full_name || requesterName}</span>
            <span className="text-ink-soft">{formatDateTime(m.created_at)}</span>
            {m.internal && (
              <Pill tone="grey" icon="info">
                {t('support.internalNote')}
              </Pill>
            )}
          </div>
          <p className="whitespace-pre-line break-words">{m.body}</p>
          {m.attachment && (
            <a href={fileUrl(m.attachment.id)} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center font-semibold text-teal-text underline">
              {t('support.screenshot')}: {m.attachment.original_name}
            </a>
          )}
        </li>
      ))}
    </ol>
  )
}
