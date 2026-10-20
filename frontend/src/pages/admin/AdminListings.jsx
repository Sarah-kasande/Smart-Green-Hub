// Listing moderation (FR15): the administrator sees every Surplus Board listing and can withdraw
// one with a reason (e.g. a duplicate or a mistake). Open requests are cancelled automatically.
import { useState } from 'react'
import api, { errorCode } from '../../api/client'
import { useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import PageLoader from '../../components/ui/PageLoader'
import { StatusBadge } from '../../components/ui/Badges'
import { EmptyState, PageHeader, Segmented } from '../../components/ui/Layout'
import { formatDate, formatNumber, formatRWF } from '../../utils/format'

const FILTERS = ['active', 'reserved', 'fulfilled', 'expired', 'withdrawn', 'all']

export default function AdminListings() {
  const { t } = useI18n()
  const [status, setStatus] = useState('active')
  const { data, error, reload } = useApi(`/admin/listings?status=${status}`)
  const [notice, setNotice] = useState(null)

  async function withdraw(listing) {
    const reason = window.prompt(t('adminListings.reason'))
    if (!reason) return
    try {
      await api.post(`/admin/listings/${listing.id}/withdraw`, { reason })
      setNotice({ type: 'success', text: 'listings.withdrawn' })
      reload()
    } catch (err) {
      setNotice({ type: 'error', text: `errors.${errorCode(err)}` })
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title={t('adminListings.title')} intro={t('adminListings.intro')} />
      {notice && <Notice type={notice.type}>{t(notice.text)}</Notice>}
      <Segmented label={t('adminListings.title')} value={status} onChange={setStatus} options={FILTERS.map((f) => ({ value: f, label: f === 'all' ? t('common.all') : t(`listingStatus.${f}`) }))} />
      {error && <Notice type="error">{t(`errors.${error}`)}</Notice>}
      {!data && !error && <PageLoader />}
      {data && data.listings.length === 0 && <EmptyState icon="board" title={t('listings.empty')} />}
      {data && data.listings.length > 0 && (
        <Card className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-line text-ink-soft">
              <tr>
                <th className="p-3">{t('batches.species')}</th>
                <th className="p-3">{t('impact.nursery')}</th>
                <th className="p-3 text-right">{t('listings.offered')}</th>
                <th className="p-3 text-right">{t('listings.remaining')}</th>
                <th className="p-3">{t('listings.offerType')}</th>
                <th className="p-3">{t('listings.expiresAt')}</th>
                <th className="p-3">{t('adminListings.status')}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.listings.map((l) => (
                <tr key={l.id}>
                  <td className="p-3 font-semibold">{l.species?.name}</td>
                  <td className="p-3">
                    {l.nursery?.name} <span className="text-ink-soft">({l.nursery?.district})</span>
                  </td>
                  <td className="p-3 text-right">{formatNumber(l.quantity_offered)}</td>
                  <td className="p-3 text-right">{formatNumber(l.remaining)}</td>
                  <td className="p-3">{l.offer_type === 'free' ? t('listings.free') : formatRWF(l.discounted_price)}</td>
                  <td className="p-3">{formatDate(l.expires_at)}</td>
                  <td className="p-3">
                    <StatusBadge group="listingStatus" status={l.status} />
                  </td>
                  <td className="p-3">
                    {['active', 'reserved'].includes(l.status) && (
                      <Button variant="ghost" onClick={() => withdraw(l)}>
                        {t('listings.withdraw')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
