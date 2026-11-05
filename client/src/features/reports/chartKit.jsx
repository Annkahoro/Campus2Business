import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Table2 } from 'lucide-react';
import { Card } from '../../components/ui/index.js';
import { cn } from '../../lib/cn.js';

/**
 * Chart conventions (docs/08 §7): solid fills only, series colours in fixed order, grid #E6DFCC.
 * The mint series always gets an emerald stroke (mint alone is only 1.25:1 against white),
 * and every chart has a table view, so values never depend on colour alone.
 */
export const SERIES = [
  { fill: '#055F46', stroke: '#055F46' },
  { fill: '#A7F3D0', stroke: '#055F46' },
  { fill: '#1D4E89', stroke: '#1D4E89' },
  { fill: '#B45309', stroke: '#B45309' },
  { fill: '#5B6B65', stroke: '#5B6B65' },
];
export const GRID = '#E6DFCC';
export const AXIS_TICK = { fill: '#5B6B65', fontSize: 12 };

export const monthLabel = (ym, lang) => {
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat(lang, { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
};

/** Card with a title and a Chart / Table toggle. `table` = { columns: [label], rows: [[cell]] } */
export function ChartCard({ title, description, table, children, className, action }) {
  const { t } = useTranslation('reports');
  const [view, setView] = useState('chart');
  return (
    <Card className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {table && (
            <div role="group" aria-label={t('view.label')} className="inline-flex rounded-lg bg-cream-dark p-0.5">
              {[
                { v: 'chart', Icon: BarChart3 },
                { v: 'table', Icon: Table2 },
              ].map(({ v, Icon }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  title={t(`view.${v}`)}
                  className={cn(
                    'rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald',
                    view === v ? 'bg-surface text-emerald shadow-sm' : 'text-ink-muted hover:text-emerald',
                  )}
                >
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span className="sr-only">{t(`view.${v}`)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {view === 'table' && table ? <DataTable {...table} /> : children}
    </Card>
  );
}

export function DataTable({ columns, rows }) {
  return (
    <div className="max-h-80 overflow-auto rounded-xl border border-line">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-cream-dark text-xs uppercase text-ink-muted">
          <tr>
            {columns.map((c, i) => (
              <th key={c} scope="col" className={cn('px-3 py-2 font-semibold', i > 0 && 'text-right')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={cn('px-3 py-2', j > 0 && 'text-right tabular-nums')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Recharts tooltip in the card style; values in ink, the swatch carries identity. */
export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-[var(--shadow-card)]">
      {label !== undefined && <p className="mb-1 font-semibold text-ink">{labelFormatter ? labelFormatter(label) : label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.payload?.fill ?? p.color, border: `1px solid ${p.stroke ?? p.color}` }} aria-hidden="true" />
            <span className="text-ink-muted">{p.name}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">{valueFormatter(p.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Legend as HTML (always shown for ≥ 2 series). */
export function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-4 text-sm text-ink-muted">
      {items.map(({ label, series }) => (
        <li key={label} className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm" style={{ background: series.fill, border: `1.5px solid ${series.stroke}` }} aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** Stat tile (a number is the right form for a single headline value). */
export function StatTile({ icon: Icon, label, value, hint, to, as: As = 'div', className }) {
  return (
    <Card as={As} to={to} className={cn('flex items-center gap-4', to && 'transition-colors hover:border-emerald', className)}>
      {Icon && (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-emerald">
          <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold tabular-nums text-ink">{value ?? '—'}</p>
        <p className="text-sm text-ink-muted">{label}</p>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
    </Card>
  );
}

/**
 * Horizontal HTML bars (funnels, rankings): label · bar · value. Single hue, value labels always visible.
 * rows: [{ key, label, value, sub? }]
 */
export function BarRows({ rows, max, format = (v) => v }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-ink">{r.label}</span>
            <span className="shrink-0 tabular-nums text-ink">
              <span className="font-semibold">{format(r.value)}</span>
              {r.sub && <span className="ml-1.5 text-ink-muted">{r.sub}</span>}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream-dark" aria-hidden="true">
            <div className="h-full rounded-full bg-emerald" style={{ width: `${Math.max(r.value ? 2 : 0, (r.value / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
