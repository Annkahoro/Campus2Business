import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Building2, ClipboardList, GraduationCap, Send, Sparkles, Users } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, PageSpinner } from '../../components/ui/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminReport } from '../../features/reports/hooks.js';
import { BarRows, StatTile } from '../../features/reports/chartKit.jsx';
import EnrollmentsByMonthChart from '../../features/reports/EnrollmentsByMonthChart.jsx';
import { formatDate } from '../../features/programmes/format.js';
import { loc } from '../../lib/localized.js';

function AttentionList({ title, items, empty, to, render }) {
  const { t } = useTranslation('reports');
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        action={
          <Button as={Link} to={to} variant="ghost" size="sm">
            {t('viewAll')}
          </Button>
        }
      />
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">{items.map(render)}</ul>
      )}
    </Card>
  );
}

/** /admin — stat cards, "needs attention", enrollments chart, top programmes (docs/09). */
export default function AdminDashboard() {
  const { t, i18n } = useTranslation('reports');
  const lang = i18n.resolvedLanguage;
  const { user } = useAuth();
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

  const { cards, needsAttention, enrollmentsByMonth, topProgrammes } = query.data;
  const row = 'flex items-center justify-between gap-3 py-2.5 text-sm';

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-ink-muted">{t('admin.eyebrow')}</p>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('admin.greeting', { name: user?.name })}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile as={Link} to="/admin/organizations?status=pending" icon={Building2} label={t('cards.pendingOrgs')} value={cards.pendingOrgs} />
        <StatTile as={Link} to="/admin/recommendations?status=pending_review" icon={Sparkles} label={t('cards.pendingReviews')} value={cards.pendingReviews} />
        <StatTile as={Link} to="/admin/learners" icon={Users} label={t('cards.activeLearners')} value={cards.activeLearners} />
        <StatTile as={Link} to="/admin/enrollments?status=active" icon={GraduationCap} label={t('cards.activeEnrollments')} value={cards.activeEnrollments} />
      </div>

      <section aria-labelledby="needs-attention" className="space-y-4">
        <h2 id="needs-attention" className="font-display text-xl font-semibold">
          {t('admin.needsAttention')}
        </h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <AttentionList
            title={t('attention.pendingOrgs')}
            items={needsAttention.pendingOrgs}
            empty={t('attention.none')}
            to="/admin/organizations?status=pending"
            render={(o) => (
              <li key={o.id} className={row}>
                <Link to={`/admin/organizations/${o.id}`} className="min-w-0 truncate font-medium text-ink hover:text-emerald hover:underline">
                  {o.name}
                </Link>
                <span className="shrink-0 text-ink-muted">{formatDate(o.createdAt, lang)}</span>
              </li>
            )}
          />
          <AttentionList
            title={t('attention.submittedProfiles', { count: cards.submittedProfiles })}
            items={needsAttention.submittedProfiles}
            empty={t('attention.none')}
            to="/admin/learners?status=submitted"
            render={(p) => (
              <li key={p.id} className={row}>
                <Link to={`/admin/learners/${p.id}`} className="min-w-0 truncate font-medium text-ink hover:text-emerald hover:underline">
                  {p.name}
                </Link>
                <span className="shrink-0 text-ink-muted">{t(`learnerType.${p.learnerType}`)}</span>
              </li>
            )}
          />
          <AttentionList
            title={t('attention.drafts')}
            items={needsAttention.draftsToReview}
            empty={t('attention.none')}
            to="/admin/recommendations?status=pending_review"
            render={(r) => (
              <li key={r.id} className={row}>
                <Link to={`/admin/recommendations/${r.id}`} className="min-w-0 truncate font-medium text-ink hover:text-emerald hover:underline">
                  {r.learner} · v{r.version}
                </Link>
                {r.confidence !== null && <span className="shrink-0 text-ink-muted">{t('attention.confidence', { value: r.confidence })}</span>}
              </li>
            )}
          />
        </div>
        {cards.enrollmentRequests > 0 && (
          <Card className="flex flex-wrap items-center justify-between gap-3 py-4">
            <span className="inline-flex items-center gap-2 font-medium">
              <ClipboardList size={20} strokeWidth={1.75} className="text-warning" aria-hidden="true" />
              {t('attention.enrollmentRequests', { count: cards.enrollmentRequests })}
            </span>
            <Button as={Link} to="/admin/enrollments?status=requested" size="sm" leftIcon={<Send size={16} aria-hidden="true" />}>
              {t('attention.review')}
            </Button>
          </Card>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <EnrollmentsByMonthChart data={enrollmentsByMonth} />
        </div>
        <Card className="space-y-4 xl:col-span-2">
          <CardHeader
            title={t('charts.topProgrammes')}
            action={
              <Button as={Link} to="/admin/reports" variant="ghost" size="sm">
                {t('allReports')}
              </Button>
            }
          />
          {topProgrammes.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('noData')}</p>
          ) : (
            <BarRows
              rows={topProgrammes.slice(0, 5).map((p) => ({
                key: p.id,
                label: loc(p.title, lang),
                value: p.enrollments,
                sub: t('completedShort', { count: p.completed }),
              }))}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
