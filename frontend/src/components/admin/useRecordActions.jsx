// Archive, Unarchive and Delete for the administrator's record pages (docs/DEVIATIONS.md W47), each confirmed
// in a dialog. Archive and Delete need a reason. Delete is permanent and only works when nothing is linked;
// otherwise the server answers HAS_HISTORY with what is linked, shown here with an "Archive instead" button.
import { useState } from 'react'
import api, { errorCode } from '../../api/client'
import { useI18n } from '../../i18n/I18nProvider'
import { useAsk } from '../ui/AskDialog'
import Button from '../ui/Button'
import Notice from '../ui/Notice'
import { LinksList } from './RecordTools'

// kind: 'nursery' | 'institution' | 'batch'; path: 'nurseries' | 'institutions' | 'batches'
export function useRecordActions(kind, path, onChanged) {
  const { t } = useI18n()
  const [askElement, ask] = useAsk()
  const [notice, setNotice] = useState(null) // { type, text, values?, links?, item? }

  async function archive(item) {
    const reason = await ask({
      title: t('records.archiveTitle', { name: item.name }),
      text: t(`records.archiveEffect.${kind}`),
      label: t('records.reason'),
      required: true,
      confirmLabel: t('records.archive'),
      danger: true,
    })
    if (!reason) return
    try {
      const res = await api.post(`/admin/${path}/${item.id}/archive`, { reason })
      const released = res.data.released || {}
      setNotice({ type: 'success', text: 'records.archived', values: { requests: released.requestsCancelled || 0, listings: released.listingsWithdrawn || 0 } })
      onChanged()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    }
  }

  async function unarchive(item) {
    const reason = await ask({ title: t('records.unarchiveTitle', { name: item.name }), text: t('records.unarchiveText'), label: t('records.reason'), confirmLabel: t('records.unarchive') })
    if (reason === null) return
    try {
      await api.post(`/admin/${path}/${item.id}/unarchive`, { reason: reason || null })
      setNotice({ type: 'success', text: 'records.unarchived' })
      onChanged()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    }
  }

  async function remove(item) {
    const reason = await ask({
      title: t('records.deleteTitle', { name: item.name }),
      text: t('records.deleteText'),
      label: t('records.reason'),
      required: true,
      confirmLabel: t('records.delete'),
      danger: true,
    })
    if (!reason) return
    try {
      await api.delete(`/admin/${path}/${item.id}`, { data: { reason } })
      setNotice({ type: 'success', text: 'records.deleted' })
      onChanged({ deleted: item.id })
    } catch (err) {
      if (errorCode(err) === 'HAS_HISTORY') setNotice({ type: 'warning', text: 'records.hasHistory', links: err.response?.data?.details?.links, item })
      else setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    }
  }

  const noticeElement = notice && (
    <Notice type={notice.type}>
      <p>{t(notice.text, notice.values)}</p>
      {notice.links && (
        <div className="mt-2">
          <LinksList links={notice.links} />
        </div>
      )}
      {notice.item && !notice.item.archived_at && (
        <Button variant="secondary" className="mt-3" onClick={() => archive(notice.item)}>
          {t('records.archiveInstead')}
        </Button>
      )}
    </Notice>
  )

  return { askElement, noticeElement, archive, unarchive, remove, setNotice }
}
