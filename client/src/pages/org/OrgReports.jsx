import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, CheckCircle2, GraduationCap, Percent, RefreshCw, Route, Sparkles, Users } from 'lucide-react';
import { Alert, Badge, Button, Card, CardHeader, EmptyState, PageSpinner, Spinner, toast } from '../../components/ui/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useGenerateOrgAiSummary, useOrgAiSummary, useOrgReport, useOrgSkillGaps } from '../../features/reports/hooks.js';
import { AXIS_TICK, BarRows, ChartCard, ChartTooltip, GRID, Legend, SERIES, StatTile } from '../../features/reports/chartKit.jsx';
import { formatDate } from '../../features/programmes/format.js';
import { loc } from '../../lib/localized.js';

/** Funnel: joined → complete → submitted → published → enrolled → completed (docs/09). */
function Funnel({ funnel }) {
  const { t } = useTranslation('reports');
  const first = funnel[0]?.count || 0;
  return (
    <ChartCard
      title={t('charts.funnel')}
      description={t('charts.funnelText')}
      table={{
        columns: [t('columns.stage'), t('columns.employees'), t('columns.ofJoined')],
        rows: funnel.map((s) => [t(`funnel.${s.stage}`), s.count, first ? `${Math.round((s.count / first) * 100)}%` : '—']),
      }}
    >
      <BarRows
        max={Math.max(1, first)}
        rows={funnel.map((s) => ({
          key: s.stage,
          label: t(`funnel.${s.stage}`),
          value: s.count,
          sub: first ? `(${Math.round((s.count / first) * 100)}%)` : undefined,
        }))}
      />
    </ChartCard>
  );
}

function DepartmentsChart({ rows }) {
  const { t } = useTranslation('reports');
  const series = [
    { key: 'employees', label: t('series.employees'), ...SERIES[0] },
    { key: 'published', label: t('series.pathways'), ...SERIES[1] },
  ];
  return (
    <ChartCard
      title={t('charts.byDepartment')}
      description={t('charts.byDepartmentText')}
      table={{
        columns: [t('columns.department'), t('columns.headcount'), t('columns.employees'), t('columns.submitted'), t('series.pathways')],
        rows: rows.map((d) => [d.department, d.headcount ?? '—', d.employees, d.submitted, d.published]),
      }}
    >
      <Legend items={series.map((s) => ({ label: s.label, series: s }))} />
      <div className="h-64" role="img" aria-label={t('charts.byDepartment')}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2} barCategoryGap="30%" margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="department" tick={AXIS_TICK} axisLine={{ stroke: GRID }} tickLine={false} interval={0} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#F5EBD0', opacity: 0.6 }} content={<ChartTooltip />} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.fill} stroke={s.stroke} strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={32} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function SkillGaps() {
  const { t, i18n } = useTranslation('reports');
  const lang = i18n.resolvedLanguage;
  const query = useOrgSkillGaps();
  if (query.isPending) return <Spinner className="text-emerald" />;
  const data = query.data;
  if (!data || data.analysedEmployees === 0) {
    return (
      <Card>
        <CardHeader title={t('charts.skillGaps')} />
        <p className="text-sm text-ink-muted">{t('skillGaps.empty')}</p>
      </Card>
    );
  }
  return (
    <section aria-labelledby="skill-gaps" className="space-y-4">
      <div>
        <h2 id="skill-gaps" className="font-display text-xl font-semibold">
          {t('charts.skillGaps')}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t('skillGaps.text', { count: data.analysedEmployees })}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {data.byDepartment.map((d) => (
          <ChartCard
            key={d.department}
            title={d.department}
            description={t('skillGaps.analysed', { count: d.learners })}
            table={{
              columns: [t('columns.skill'), t('columns.employees'), t('columns.highPriority')],
              rows: d.skills.map((s) => [loc(s.skill, lang), s.count, s.high]),
            }}
          >
            <BarRows
              max={d.learners}
              rows={d.skills.map((s) => ({
                key: s.skill.en,
                label: loc(s.skill, lang),
                value: s.count,
                sub: s.high ? t('skillGaps.high', { count: s.high }) : undefined,
              }))}
            />
          </ChartCard>
        ))}
      </div>
    </section>
  );
}

function AiSummary() {
  const { t, i18n } = useTranslation('reports');
  const lang = i18n.resolvedLanguage;
  const { organization } = useAuth();
  const query = useOrgAiSummary();
  const generate = useGenerateOrgAiSummary();
  const summary = query.data;
  const approved = organization.status === 'approved';

  const run = (refresh) =>
    generate.mutate(refresh, {
      onSuccess: (d) => toast.success(d.cached ? t('ai.cached') : t('ai.ready')),
      onError: toast.apiError,
    });

  return (
    <Card className="space-y-4 border-emerald">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint text-emerald-darker">
            <Sparkles size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">{t('ai.title')}</h2>
            <p className="text-sm text-ink-muted">{t('ai.text')}</p>
          </div>
        </div>
        {approved && (
          <Button
            onClick={() => run(!!summary)}
            loading={generate.isPending}
            variant={summary ? 'outline' : 'primary'}
            leftIcon={summary ? <RefreshCw size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
          >
            {summary ? t('ai.refresh') : t('ai.generate')}
          </Button>
        )}
      </div>

      {generate.isPending && <Alert variant="info">{t('ai.generating')}</Alert>}
      {!summary && !generate.isPending && <p className="text-sm text-ink-muted">{approved ? t('ai.none') : t('ai.notApproved')}</p>}

      {summary && (
        <div className="space-y-5">
          <p className="text-ink">{loc(summary.summary, lang)}</p>
          {summary.highlights.length > 0 && (
            <ul className="space-y-2">
              {summary.highlights.map((h, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <CheckCircle2 size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-emerald" aria-hidden="true" />
                  {loc(h, lang)}
                </li>
              ))}
            </ul>
          )}
          {summary.suggestedProgrammes.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-ink-muted">{t('ai.suggested')}</h3>
              <ol className="grid gap-3 md:grid-cols-3">
                {summary.suggestedProgrammes.map((s, i) => (
                  <li key={s.programme.id} className="rounded-xl border border-line bg-cream p-4">
                    <p className="text-xs font-semibold text-emerald">#{i + 1}</p>
                    <p className="font-semibold">{loc(s.programme.title, lang)}</p>
                    {s.departments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.departments.map((d) => (
                          <Badge key={d} variant="soft">
                            {d}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-sm text-ink-muted">{loc(s.reason, lang)}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="text-xs text-ink-muted">{t('ai.generatedAt', { date: formatDate(summary.generatedAt, lang) })}</p>
        </div>
      )}
    </Card>
  );
}

/** /org/reports — departments, completion funnel, skill gaps, AI summary (docs/09). */
export default function OrgReports() {
  const { t } = useTranslation('reports');
  const query = useOrgReport();

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
  const { cards, funnel, byDepartment, enrollments } = query.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('org.title')}</h1>
        <p className="mt-1 text-ink-muted">{t('org.subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Users} label={t('cards.employees')} value={cards.joined} />
        <StatTile icon={Route} label={t('cards.pathways')} value={cards.published} />
        <StatTile icon={GraduationCap} label={t('cards.completedProgrammes')} value={cards.completedProgrammes} />
        <StatTile icon={Percent} label={t('totals.completionRate')} value={enrollments.completionRate === null ? '—' : `${enrollments.completionRate}%`} hint={t('totals.completionRateHint')} />
      </div>

      <AiSummary />

      <div className="grid gap-6 xl:grid-cols-2">
        <DepartmentsChart rows={byDepartment} />
        <Funnel funnel={funnel} />
      </div>

      <SkillGaps />
    </div>
  );
}
