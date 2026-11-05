import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, BookOpenCheck, Building2, Cpu, GraduationCap, Percent, Route, Users } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, PageSpinner } from '../../components/ui/index.js';
import { useAdminReport } from '../../features/reports/hooks.js';
import { AXIS_TICK, BarRows, ChartCard, ChartTooltip, GRID, Legend, SERIES, StatTile, monthLabel } from '../../features/reports/chartKit.jsx';
import EnrollmentsByMonthChart from '../../features/reports/EnrollmentsByMonthChart.jsx';
import { loc } from '../../lib/localized.js';

const ENROLLMENT_ORDER = ['requested', 'payment_pending', 'active', 'completed', 'dropped', 'rejected'];

/** /admin/reports — totals, enrollments by month, completion rate, popular programmes, AI usage (docs/09). */
export default function AdminReports() {
  const { t, i18n } = useTranslation('reports');
  const lang = i18n.resolvedLanguage;
  const num = new Intl.NumberFormat(lang);
  const compact = new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 });
  const query = useAdminReport();

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return (
      <EmptyState
        illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('loadError')}
        action={<Button onClick={() => query.refetch()}>{t('actions.retry')}</Button>}
      />
    );
  }

  const { totals, completionRate, enrollmentsByMonth, topProgrammes, aiUsage } = query.data;
  const tokenSeries = [
    { key: 'inputTokens', label: t('series.inputTokens'), ...SERIES[0] },
    { key: 'outputTokens', label: t('series.outputTokens'), ...SERIES[1] },
  ];
  const fmtMonth = (m) => monthLabel(m, lang);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('admin.reportsTitle')}</h1>
        <p className="mt-1 text-ink-muted">{t('admin.reportsSubtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Users} label={t('totals.learners')} value={num.format(totals.students + totals.employees)} hint={t('totals.learnersHint', { students: totals.students, employees: totals.employees })} />
        <StatTile icon={Building2} label={t('totals.organizations')} value={num.format(totals.organizations.approved ?? 0)} hint={t('totals.orgsPending', { count: totals.organizations.pending ?? 0 })} />
        <StatTile icon={BookOpenCheck} label={t('totals.programmes')} value={num.format(totals.programmes.published ?? 0)} />
        <StatTile icon={Route} label={t('totals.pathways')} value={num.format(totals.recommendations.published ?? 0)} />
        <StatTile icon={GraduationCap} label={t('totals.completed')} value={num.format(totals.enrollments.completed ?? 0)} />
        <StatTile icon={Percent} label={t('totals.completionRate')} value={completionRate === null ? '—' : `${completionRate}%`} hint={t('totals.completionRateHint')} />
        <StatTile icon={Cpu} label={t('totals.generations')} value={num.format(aiUsage.generations)} hint={t('totals.failed', { count: aiUsage.failed })} />
        <StatTile icon={Cpu} label={t('totals.tokens')} value={compact.format(aiUsage.totalInputTokens + aiUsage.totalOutputTokens)} hint={t('totals.tokensHint', { input: compact.format(aiUsage.totalInputTokens), output: compact.format(aiUsage.totalOutputTokens) })} />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <EnrollmentsByMonthChart data={enrollmentsByMonth} description={t('charts.enrollmentsByMonthText')} />
        </div>
        <ChartCard
          className="xl:col-span-2"
          title={t('charts.enrollmentsByStatus')}
          table={{
            columns: [t('columns.status'), t('columns.count')],
            rows: ENROLLMENT_ORDER.map((s) => [t(`status.${s}`), totals.enrollments[s] ?? 0]),
          }}
        >
          <BarRows rows={ENROLLMENT_ORDER.map((s) => ({ key: s, label: t(`status.${s}`), value: totals.enrollments[s] ?? 0 }))} />
        </ChartCard>
      </div>

      <Card className="space-y-4">
        <CardHeader title={t('charts.topProgrammes')} description={t('charts.topProgrammesText')} />
        {topProgrammes.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-cream-dark text-xs uppercase text-ink-muted">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">{t('columns.programme')}</th>
                  <th scope="col" className="w-1/3 px-3 py-2 font-semibold">{t('columns.enrollments')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{t('columns.completed')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{t('columns.avgScore')}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{t('columns.avgRating')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {topProgrammes.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{loc(p.title, lang)}</p>
                      <p className="text-xs text-ink-muted">{p.code}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-dark" aria-hidden="true">
                          <div className="h-full rounded-full bg-emerald" style={{ width: `${(p.enrollments / topProgrammes[0].enrollments) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right font-semibold tabular-nums">{p.enrollments}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.completed}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.avgScore ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.avgRating ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ChartCard
        title={t('charts.aiUsage')}
        description={t('charts.aiUsageText')}
        table={{
          columns: [t('columns.month'), t('columns.generations'), ...tokenSeries.map((s) => s.label), t('columns.avgLatency')],
          rows: aiUsage.byMonth.map((m) => [
            fmtMonth(m.month),
            m.generations,
            num.format(m.inputTokens),
            num.format(m.outputTokens),
            m.avgLatencyMs ? `${(m.avgLatencyMs / 1000).toFixed(1)} s` : '—',
          ]),
        }}
      >
        <Legend items={tokenSeries.map((s) => ({ label: s.label, series: s }))} />
        <div className="h-64" role="img" aria-label={t('charts.aiUsage')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aiUsage.byMonth} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="month" tickFormatter={fmtMonth} tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v) => compact.format(v)} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#F5EBD0', opacity: 0.6 }} content={<ChartTooltip labelFormatter={fmtMonth} valueFormatter={(v) => num.format(v)} />} />
              {tokenSeries.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="tokens"
                  fill={s.fill}
                  stroke={s.stroke}
                  strokeWidth={1}
                  radius={i === tokenSeries.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
