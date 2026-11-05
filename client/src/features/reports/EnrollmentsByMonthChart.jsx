import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS_TICK, ChartCard, ChartTooltip, GRID, Legend, SERIES, monthLabel } from './chartKit.jsx';

/** Requested vs completed enrollments per month (two series, one axis, same unit). */
export default function EnrollmentsByMonthChart({ data, title, description }) {
  const { t, i18n } = useTranslation('reports');
  const lang = i18n.resolvedLanguage;
  const series = [
    { key: 'requested', label: t('series.requested'), ...SERIES[0] },
    { key: 'completed', label: t('series.completed'), ...SERIES[1] },
  ];
  const fmt = (m) => monthLabel(m, lang);

  return (
    <ChartCard
      title={title ?? t('charts.enrollmentsByMonth')}
      description={description}
      table={{
        columns: [t('columns.month'), ...series.map((s) => s.label)],
        rows: data.map((d) => [fmt(d.month), d.requested, d.completed]),
      }}
    >
      <Legend items={series.map((s) => ({ label: s.label, series: s }))} />
      <div className="h-64" role="img" aria-label={title ?? t('charts.enrollmentsByMonth')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="month" tickFormatter={fmt} tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#F5EBD0', opacity: 0.6 }} content={<ChartTooltip labelFormatter={fmt} />} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.fill} stroke={s.stroke} strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={22} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
