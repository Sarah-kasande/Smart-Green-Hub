// Upload and list verification documents (PDF, PNG or JPEG, up to 10 MB).
// The server checks the real file type again; the checks here only give faster feedback.
import { useEffect, useRef, useState } from 'react'
import api, { errorCode } from '../../api/client'
import { fileUrl } from '../../api/files'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Notice from '../../components/ui/Notice'
import { formatDate, formatFileSize } from '../../utils/format'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '../../utils/options'

export function DocumentList({ documents, emptyText }) {
  if (!documents.length) return <p className="text-ink-soft">{emptyText}</p>
  return (
    <ul className="divide-y divide-line">
      {documents.map((doc) => (
        <li key={doc.id}>
          <a href={fileUrl(doc.id)} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-3 py-2 hover:text-teal-text">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium underline">{doc.original_name}</span>
              <span className="block text-sm text-ink-soft">
                {formatFileSize(doc.size_bytes)} · {formatDate(doc.created_at)}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export default function Documents() {
  const { t } = useI18n()
  const [documents, setDocuments] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const input = useRef(null)

  async function load() {
    const { data } = await api.get('/me/documents')
    setDocuments(data.documents)
  }

  // First load when the section opens
  useEffect(() => {
    let cancelled = false
    api
      .get('/me/documents')
      .then(({ data }) => !cancelled && setDocuments(data.documents))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function upload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage(null)
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) return setMessage({ type: 'error', code: 'UNSUPPORTED_FILE_TYPE' })
    if (file.size > MAX_UPLOAD_BYTES) return setMessage({ type: 'error', code: 'FILE_TOO_LARGE' })

    setBusy(true)
    try {
      // The file bytes are the request body; its name travels in a header.
      await api.post('/uploads/verification-documents', file, {
        headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
      })
      setMessage({ type: 'success' })
      await load()
    } catch (err) {
      setMessage({ type: 'error', code: errorCode(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">{t('account.documentsHint')}</p>
      {message && <Notice type={message.type}>{message.type === 'success' ? t('account.uploaded') : t(`errors.${message.code}`)}</Notice>}
      <DocumentList documents={documents} emptyText={t('account.noDocuments')} />
      <input ref={input} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={upload} className="sr-only" tabIndex={-1} aria-hidden="true" />
      <Button variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? t('account.uploading') : t('account.upload')}
      </Button>
    </div>
  )
}
