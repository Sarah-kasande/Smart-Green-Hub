// Charts built with the shadcn/ui Chart component (Recharts underneath).
// This file is loaded only on pages that show a chart (see ./index.jsx), so phones download
// the chart library only when needed. Colours come from the palette (--chart-1..5 in index.css).
// Every chart also has a hidden table with the same numbers for screen readers, so the drawn chart
// itself is hidden from them and not keyboard-focusable (accessibilityLayer off).
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/shadcn/chart'

function ScreenReaderTable({ title, columns, rows }) {
  return (
    <table className="sr-only">
      <caption>{title}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} scope="col">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c.key}>{c.format ? c.format(row[c.key]) : row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// data: [{ label: 'Oct', value: 12 }]
export function SimpleBarChart({ data, title, valueLabel, color = 'var(--chart-1)', format = (v) => v, height = 220 }) {
  const config = { value: { label: valueLabel || title, color } }
  return (
    <figure>
      <ChartContainer config={config} className="w-full" style={{ height }} aria-hidden="true" inert>
        <BarChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={format} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v) => format(v)} />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ChartContainer>
      <ScreenReaderTable
        title={title}
        columns={[
          { key: 'label', label: '' },
          { key: 'value', label: valueLabel || title, format },
        ]}
        rows={data}
      />
    </figure>
  )
}

// Income and expenses per month. data: [{ label, income, expenses }]
export function IncomeExpenseChart({ data, title, labels, format = (v) => v, height = 240 }) {
  const config = {
    income: { label: labels.income, color: 'var(--chart-1)' },
    expenses: { label: labels.expenses, color: 'var(--chart-4)' },
  }
  return (
    <figure>
      <ChartContainer config={config} className="w-full" style={{ height }} aria-hidden="true" inert>
        <AreaChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={format} />
          <ChartTooltip content={<ChartTooltipContent formatter={(v, name) => `${config[name]?.label}: ${format(v)}`} />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Area dataKey="income" type="monotone" fill="var(--color-income)" fillOpacity={0.18} stroke="var(--color-income)" strokeWidth={2} />
          <Area dataKey="expenses" type="monotone" fill="var(--color-expenses)" fillOpacity={0.12} stroke="var(--color-expenses)" strokeWidth={2} />
        </AreaChart>
      </ChartContainer>
      <ScreenReaderTable
        title={title}
        columns={[
          { key: 'label', label: '' },
          { key: 'income', label: labels.income, format },
          { key: 'expenses', label: labels.expenses, format },
        ]}
        rows={data}
      />
    </figure>
  )
}

// Share of something by part, e.g. risk levels. parts: [{ key, label, value, color }]
// The legend always shows the WORD and the number, so colour is never the only signal.
export function DonutChart({ parts, title, centerLabel, centerValue, height = 200 }) {
  const config = Object.fromEntries(parts.map((p) => [p.key, { label: p.label, color: p.color }]))
  const data = parts.filter((p) => p.value > 0)
  return (
    <figure className="flex flex-col items-center gap-3 sm:flex-row">
      <div className="relative" style={{ width: height, height }} aria-hidden="true" inert>
        <ChartContainer config={config} className="h-full w-full">
          <PieChart accessibilityLayer={false}>
            <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie data={data.length ? data : [{ key: 'empty', value: 1 }]} dataKey="value" nameKey="key" innerRadius="62%" outerRadius="92%" strokeWidth={2} stroke="var(--color-surface)">
              {(data.length ? data : [{ key: 'empty' }]).map((p) => (
                <Cell key={p.key} fill={p.key === 'empty' ? 'var(--color-line)' : `var(--color-${p.key})`} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-semibold tabular-nums">{centerValue}</p>
            <p className="text-xs text-ink-soft">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
            <span className="font-semibold">{p.label}</span>
            <span className="tabular-nums text-ink-soft">{p.value}</span>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">{title}</figcaption>
    </figure>
  )
}
