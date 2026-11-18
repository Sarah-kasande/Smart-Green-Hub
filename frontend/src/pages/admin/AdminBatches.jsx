// Administrator: batches of every nursery (docs/DEVIATIONS.md W47, W48).
//  - Table (cards on phones) with search, Active / Archived / All with counts, and filters by nursery,
//    species, stage and homepage.
//  - Detail: stock history, what is linked, safe edits (price per plant; a quantity correction needs a
//    reason and is saved as a stock change), Archive / Unarchive / Delete.
//  - Homepage: Publish / Unpublish one batch or several at once, and the "Featured" position.
//    Only ready batches with free plants, from approved, non-archived nurseries that agreed, can be
//    published; the server says why a batch is blocked.
import { useRef, useState } from 'react'
import api, { errorCode } from '../../api/client'
import { qs, useApi } from '../../api/useApi'
import { useI18n } from '../../i18n/I18nProvider'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Notice from '../../components/ui/Notice'
import ErrorState from '../../components/ui/ErrorState'
import PageLoader from '../../components/ui/PageLoader'
import { Pill } from '../../components/ui/Badges'
import { Fact, PageHeader } from '../../components/ui/Layout'
import { DataTable, FilterSelect, SearchBox, Toolbar } from '../../components/ui/DataView'
import { countLabel, matches } from '../../components/ui/dataViewTools'
import { TextField } from '../../components/ui/Fields'
import { ArchivedPill, LinksList, RecordButtons, RecordEditForm } from '../../components/admin/RecordTools'
import { recordStatusOptions } from '../../components/admin/recordStatus'
import { useRecordActions } from '../../components/admin/useRecordActions'
import { formatDate, formatDateTime, formatNumber, formatRWF } from '../../utils/format'

const STAGES = ['seedling', 'growing', 'ready', 'overgrown', 'cleared']
const HOMEPAGE = ['', 'shown', 'yes', 'no']

// On the homepage / published but hidden now (and why) / not published
function HomepageStatus({ batch }) {
  const { t } = useI18n()
  if (batch.on_homepage) {
    return (
      <Pill tone="green" icon="globe">
        {batch.featured_rank ? t('homepage.onHomepageRank', { n: batch.featured_rank }) : t('homepage.onHomepage')}
      </Pill>
    )
  }
  return (
    <span className="flex flex-col gap-1">
      <Pill tone="grey" icon={batch.published_at ? 'clock' : 'close'}>
        {batch.published_at ? t('homepage.publishedHidden') : t('homepage.notPublished')}
      </Pill>
      {batch.publish_block && <span className="text-sm text-ink-soft">{t(`homepage.block.${batch.publish_block}`)}</span>}
    </span>
  )
}

// The answer of a publish call: how many were published, and why the others were not
function publishMessage(t, result) {
  const lines = [t('homepage.publishedCount', { n: result.published.length })]
  for (const b of result.blocked) lines.push(`#${b.id}: ${t(`homepage.block.${b.code}`)}`)
  return { type: result.blocked.length ? 'warning' : 'success', lines }
}

function Featured({ batch, onSaved }) {
  const { t } = useI18n()
  const [rank, setRank] = useState(batch.featured_rank ? String(batch.featured_rank) : '')
  const [error, setError] = useState(null)
  async function save(event) {
    event.preventDefault()
    setError(null)
    try {
      await api.put(`/admin/batches/${batch.id}/featured`, { featured_rank: rank ? Number(rank) : null })
      onSaved()
    } catch (err) {
      setError(errorCode(err))
    }
  }
  return (
    <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="sm:w-56">
        <TextField label={t('homepage.featured')} hint={t('homepage.featuredHint')} type="number" min="1" max="99" value={rank} onChange={(e) => setRank(e.target.value)} optional error={error ? 'invalid' : null} />
      </div>
      <Button type="submit" variant="secondary">
        {t('common.save')}
      </Button>
    </form>
  )
}

function Detail({ id, actions, onClose, onChanged, onPublishResult }) {
  const { t } = useI18n()
  const { data, error, reload } = useApi(`/admin/batches/${id}`)
  const [editing, setEditing] = useState(false)
  const item = data?.item
  if (error) return <ErrorState code={error} onRetry={reload} />
  if (!item) return <PageLoader />
  const named = { ...item, name: `#${item.id} ${item.species?.name || ''}` }

  async function publish(path) {
    try {
      const res = await api.post(`/admin/batches/${path}`, { ids: [item.id] })
      onPublishResult(path === 'publish' ? publishMessage(t, res.data) : { type: 'success', lines: [t('homepage.unpublishedCount', { n: res.data.unpublished.length })] })
      reload()
      onChanged()
    } catch (err) {
      onPublishResult({ type: 'error', lines: [t(`errors.${errorCode(err)}`)] })
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{named.name}</h2>
          <p className="text-sm text-ink-soft">
            {item.nursery?.name} · {t(`districts.${item.nursery?.district}`)}
            {item.nursery?.archived && ` · ${t('records.nurseryArchived')}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ArchivedPill item={item} />
          <Pill tone="blue">{t(`stages.${item.stage}`)}</Pill>
          <Button variant="ghost" onClick={onClose}>
            {t('table.closeDetails')}
          </Button>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Fact label={t('records.stock')}>
          {formatNumber(item.quantity_current)} / {formatNumber(item.quantity_initial)}
        </Fact>
        <Fact label={t('adminListings.free')}>{formatNumber(item.free)}</Fact>
        <Fact label={t('batches.unitPrice')}>{item.unit_price ? formatRWF(item.unit_price) : '–'}</Fact>
        <Fact label={t('homepage.primeEnd')}>{item.prime_end_date ? formatDate(item.prime_end_date) : '–'}</Fact>
      </dl>

      {!item.archived_at && (
        <section className="space-y-3 rounded-xl bg-canvas p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{t('homepage.title')}</p>
            <HomepageStatus batch={item} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!item.published_at && (
              <Button icon="globe" onClick={() => publish('publish')}>
                {t('homepage.publish')}
              </Button>
            )}
            {item.published_at && (
              <Button variant="secondary" onClick={() => publish('unpublish')}>
                {t('homepage.unpublish')}
              </Button>
            )}
          </div>
          {item.published_at && (
            <Featured
              batch={item}
              onSaved={() => {
                reload()
                onChanged()
              }}
            />
          )}
        </section>
      )}

      <div>
        <p className="mb-1 text-sm font-semibold">{t('records.linked')}</p>
        <LinksList links={item.links} />
      </div>
      {item.adjustments?.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold">{t('records.stockChanges')}</p>
          <ul className="space-y-1 text-sm">
            {item.adjustments.map((a) => (
              <li key={a.id}>
                {formatDateTime(a.adjusted_at)} · {a.quantity_change > 0 ? '+' : ''}
                {formatNumber(a.quantity_change)} · {a.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing ? (
        <RecordEditForm
          path="batches"
          item={item}
          initial={{ unit_price: String(item.unit_price ?? 0), quantity_change: '' }}
          fields={[
            { name: 'unit_price', label: t('batches.unitPrice'), type: 'number' },
            { name: 'quantity_change', label: t('records.quantityChange'), type: 'number', hint: t('records.quantityChangeHint'), optional: true },
          ]}
          reasonRequired={(changes) => Boolean(changes.quantity_change)}
          onSaved={() => {
            setEditing(false)
            reload()
            onChanged()
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="border-t border-line pt-4">
          <RecordButtons item={named} actions={actions} onEdit={() => setEditing(true)} />
        </div>
      )}
    </Card>
  )
}

export default function AdminBatches() {
  const { t } = useI18n()
  const [status, setStatus] = useState('active')
  const [nurseryId, setNurseryId] = useState('')
  const [speciesId, setSpeciesId] = useState('')
  const [stage, setStage] = useState('all')
  const [homepage, setHomepage] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detailVersion, setDetailVersion] = useState(0)
  const [publishNotice, setPublishNotice] = useState(null)
  const detailRef = useRef(null)
  const { data, error, reload } = useApi(`/admin/batches${qs({ status, nursery_id: nurseryId, species_id: speciesId, stage, published: homepage })}`)
  const choices = useApi('/admin/filter-options').data
  const actions = useRecordActions('batch', 'batches', (change) => {
    if (change?.deleted) setSelectedId(null)
    setDetailVersion((v) => v + 1)
    reload()
  })

  function open(item) {
    setSelectedId(item.id)
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const rows = (data?.items || []).filter((b) => matches(search, b.species?.name, b.nursery?.name, `#${b.id}`))
  const toggle = (id) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  async function bulk(path) {
    if (!selected.length) return
    setPublishNotice(null)
    try {
      const res = await api.post(`/admin/batches/${path}`, { ids: selected })
      setPublishNotice(path === 'publish' ? publishMessage(t, res.data) : { type: 'success', lines: [t('homepage.unpublishedCount', { n: res.data.unpublished.length })] })
      setSelected([])
      setDetailVersion((v) => v + 1)
      reload()
    } catch (err) {
      setPublishNotice({ type: 'error', lines: [t(`errors.${errorCode(err)}`)] })
    }
  }

  const columns = [
    {
      key: 'select',
      header: t('homepage.select'),
      render: (b) =>
        !b.archived_at && (
          <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggle(b.id)} aria-label={t('homepage.selectBatch', { id: b.id })} className="h-6 w-6 accent-leaf" />
        ),
    },
    {
      key: 'species',
      header: t('batches.species'),
      primary: true,
      render: (b) => (
        <>
          {b.species?.name}
          <span className="block text-sm font-normal text-ink-soft">
            #{b.id} · {b.nursery?.name}
          </span>
        </>
      ),
    },
    { key: 'stage', header: t('adminListings.stage'), render: (b) => (b.archived_at ? <ArchivedPill item={b} /> : t(`stages.${b.stage}`)) },
    { key: 'stock', header: t('adminListings.inStock'), align: 'right', render: (b) => formatNumber(b.quantity_current) },
    { key: 'free', header: t('adminListings.free'), align: 'right', render: (b) => formatNumber(b.free) },
    { key: 'homepage', header: t('homepage.title'), render: (b) => <HomepageStatus batch={b} /> },
    {
      key: 'actions',
      header: t('table.actions'),
      full: true,
      render: (b) => (
        <Button variant="secondary" onClick={() => open(b)} aria-label={`${t('table.open')}: #${b.id}`}>
          {t('table.open')}
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {actions.askElement}
      <PageHeader title={t('records.batches')} meta={data && countLabel(t, rows.length)} />
      <p className="text-ink-soft">{t('homepage.adminIntro')}</p>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} label={t('table.searchBoard')} />
        <FilterSelect label={t('table.byStatus')} value={status} onChange={setStatus} options={recordStatusOptions(t, data?.counts)} />
        <FilterSelect
          label={t('impact.nursery')}
          value={nurseryId}
          onChange={setNurseryId}
          options={[{ value: '', label: t('adminListings.allNurseries') }, ...(choices?.nurseries || []).map((n) => ({ value: String(n.id), label: n.name }))]}
        />
        <FilterSelect
          label={t('board.bySpecies')}
          value={speciesId}
          onChange={setSpeciesId}
          options={[{ value: '', label: t('board.allSpecies') }, ...(choices?.species || []).map((s) => ({ value: String(s.id), label: s.name }))]}
        />
        <FilterSelect label={t('table.byStage')} value={stage} onChange={setStage} options={[{ value: 'all', label: t('adminListings.allStages') }, ...STAGES.map((s) => ({ value: s, label: t(`stages.${s}`) }))]} />
        <FilterSelect label={t('homepage.title')} value={homepage} onChange={setHomepage} options={HOMEPAGE.map((h) => ({ value: h, label: t(`homepage.filter.${h || 'all'}`) }))} />
      </Toolbar>

      {/* Bulk publishing: choose batches with the boxes, then publish or unpublish them together */}
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center">
        <p className="text-sm text-ink-soft sm:mr-auto">{t('homepage.selectedCount', { n: selected.length })}</p>
        <Button icon="globe" disabled={!selected.length} onClick={() => bulk('publish')}>
          {t('homepage.publishSelected')}
        </Button>
        <Button variant="secondary" disabled={!selected.length} onClick={() => bulk('unpublish')}>
          {t('homepage.unpublishSelected')}
        </Button>
      </div>
      {publishNotice && (
        <Notice type={publishNotice.type}>
          {publishNotice.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </Notice>
      )}
      {actions.noticeElement}
      {error && <ErrorState code={error} onRetry={reload} />}
      {!data && !error && <PageLoader />}
      {data && <DataTable caption={t('records.batches')} columns={columns} rows={rows} rowKey={(b) => b.id} empty={search ? t('table.noMatch') : t('records.empty')} />}
      <div ref={detailRef}>
        {selectedId && (
          <Detail
            key={`${selectedId}-${detailVersion}`}
            id={selectedId}
            actions={actions}
            onClose={() => setSelectedId(null)}
            onChanged={reload}
            onPublishResult={setPublishNotice}
          />
        )}
      </div>
    </div>
  )
}
