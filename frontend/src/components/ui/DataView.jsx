// Building blocks for the list pages of the signed-in app:
//   <Toolbar>      one row with a search box, a status dropdown and a Table / Cards switch
//   <WithFilters>  the page content with the FILTER panel on the right (wide screens only)
//   <DataTable>    a table with UPPERCASE headings on wide screens, stacked cards on phones
// Helpers (count text, search, remembered Table/Cards choice) are in dataViewTools.js.
import { useI18n } from '../../i18n/I18nProvider'
import { formatNumber } from '../../utils/format'
import useMediaQuery from './useMediaQuery'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table'

const WIDE = '(min-width: 768px)' // tables from tablet width up
const FILTER_PANEL = '(min-width: 1280px)' // room for the table AND the filter panel

export function Toolbar({ children }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
}

export function SearchBox({ value, onChange, label }) {
  const { t } = useI18n()
  const text = label || t('table.search')
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={text}
      aria-label={text}
      className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink shadow-xs placeholder:text-ink-soft focus:border-teal focus:outline-none sm:w-auto sm:min-w-64 sm:flex-1 lg:max-w-md"
    />
  )
}

// A dropdown filter. The visible first option says what it filters, the label is for screen readers.
export function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-12 rounded-xl border border-line bg-surface px-3 text-base font-medium text-ink shadow-xs focus:border-teal focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// Two or three joined buttons, e.g. Table | Cards. Shown on wide screens only (phones always get cards),
// unless `always` is set (e.g. Cards | Map on the Surplus Board).
export function ViewToggle({ value, onChange, options, always = false }) {
  const { t } = useI18n()
  const wide = useMediaQuery(WIDE)
  if (!wide && !always) return null
  return (
    <div role="group" aria-label={t('table.view')} className="inline-flex self-start overflow-hidden rounded-xl border border-line bg-surface shadow-xs sm:ml-auto sm:self-auto">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-12 px-4 font-semibold ${value === o.value ? 'bg-navy text-white' : 'text-ink hover:bg-canvas'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Tabs inside one page (e.g. Record sale | Record expense | History | Profit).
// The open tab is underlined AND bold, so colour is not the only signal.
export function TabBar({ label, value, onChange, options }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-line">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`-mb-px min-h-12 whitespace-nowrap border-b-4 px-4 ${
            value === o.value ? 'border-leaf font-semibold text-leaf-text' : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// The FILTER box on the right. groups: [{ label, value, onChange, options: [{ value, label, count? }] }]
export function FilterPanel({ groups }) {
  const { t } = useI18n()
  return (
    <aside aria-label={t('table.filter')} className="sticky top-20 overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
      <h2 className="bg-navy px-5 py-3 text-sm font-bold uppercase tracking-wider text-white">{t('table.filter')}</h2>
      {groups.map((group) => (
        <div key={group.label} className="border-b border-line px-3 py-4 last:border-b-0">
          <h3 className="px-2 text-sm font-semibold text-ink-soft">{group.label}</h3>
          <ul className="mt-1">
            {group.options.map((o) => {
              const active = group.value === o.value
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => group.onChange(o.value)}
                    className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-lg px-2 text-left ${
                      active ? 'font-semibold text-teal-text' : 'text-ink hover:bg-canvas'
                    }`}
                  >
                    <span>{o.label}</span>
                    {o.count !== undefined && <span className={active ? '' : 'text-ink-soft'}>{formatNumber(o.count)}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </aside>
  )
}

// Page content plus the filter panel. On narrower screens the panel is not drawn: the dropdowns in
// the toolbar do the same job.
export function WithFilters({ panel, children }) {
  const wide = useMediaQuery(FILTER_PANEL)
  if (!wide || !panel) return <div className="space-y-4">{children}</div>
  return (
    <div className="grid items-start gap-5 grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 space-y-4">{children}</div>
      {panel}
    </div>
  )
}

// columns: [{ key, header, render(row), align?: 'right', primary?: true }]
//   primary: the main column; in the card layout it is shown first, on its own line, in bold.
// view: 'table' or 'cards'. Phones always get cards. renderCard(row) replaces the default card.
export function DataTable({ columns, rows, rowKey, empty, view = 'table', renderCard, caption }) {
  const wide = useMediaQuery(WIDE)

  if (wide && view === 'table') {
    return (
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-xs">
        <Table className="text-left">
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead key={c.key} scope="col" className={`h-auto px-4 py-4 text-xs font-semibold uppercase tracking-wider text-ink-soft ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="bg-info px-5 py-5 text-base whitespace-normal text-ink">
                  {empty}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={rowKey(row)} className="hover:bg-canvas/70">
                {columns.map((c) => (
                  <TableCell key={c.key} className={`px-4 py-4 whitespace-normal ${c.align === 'right' ? 'whitespace-nowrap text-right tabular-nums' : ''} ${c.primary ? 'min-w-48 font-semibold' : ''}`}>
                    {c.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (rows.length === 0) return <EmptyBox>{empty}</EmptyBox>

  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <li key={rowKey(row)}>{renderCard ? renderCard(row) : <StackedCard columns={columns} row={row} />}</li>
      ))}
    </ul>
  )
}

// One row as a card: "HEADING value" pairs
function StackedCard({ columns, row }) {
  const main = columns.find((c) => c.primary)
  return (
    <div className="h-full rounded-2xl border border-line bg-surface p-4 shadow-xs">
      {main && <div className="mb-3 font-semibold">{main.render(row)}</div>}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {columns
          .filter((c) => !c.primary)
          .map((c) => {
            const value = c.render(row)
            // Leave out empty cells (e.g. no button for a closed listing)
            if (value === false || value === null || value === undefined || value === '') return null
            return (
              <div key={c.key} className={c.full ? 'col-span-2' : ''}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{c.header}</dt>
                <dd className="mt-1">{value}</dd>
              </div>
            )
          })}
      </dl>
    </div>
  )
}

// The one clear "nothing here" line
export function EmptyBox({ children }) {
  return <p className="rounded-2xl border border-dashed border-line bg-surface px-5 py-6 text-base font-semibold text-ink">{children}</p>
}
