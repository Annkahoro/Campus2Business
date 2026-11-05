import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BookOpen, Check } from 'lucide-react';
import { Button, Card, PageSpinner, ProgressBar } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useMyProfile } from '../../features/profile/hooks.js';
import ReadOnlyRemarks from '../../features/profile/ReadOnlyRemarks.jsx';
import { useMyEnrollments } from '../../features/enrollments/hooks.js';
import { loc } from '../../lib/localized.js';
import { cn } from '../../lib/cn.js';
import QueryError from '../../components/shared/QueryError.jsx';

const TRACK = ['profile', 'submitted', 'under_review', 'pathway_published'];
/** How many tracker stages are finished for each profile status; the next one is "current". */
const DONE_COUNT = { draft: 0, complete: 1, submitted: 2, under_review: 2, pathway_published: 4 };

/** Profile → Submitted → Under review → Pathway ready (docs/09 learner dashboard). */
function StatusTracker({ status }) {
  const { t } = useTranslation('learner');
  const doneCount = DONE_COUNT[status] ?? 0;
  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {TRACK.map((stage, i) => {
        const done = i < doneCount;
        const current = i === doneCount;
        return (
          <li
            key={stage}
            aria-current={current ? 'step' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl border p-3',
              done ? 'border-emerald bg-mint-soft' : current ? 'border-emerald bg-surface' : 'border-line bg-surface',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                done ? 'bg-emerald text-white' : current ? 'text-emerald ring-2 ring-emerald' : 'border border-line text-ink-muted',
              )}
            >
              {done ? <Check size={16} strokeWidth={2.5} /> : i + 1}
            </span>
            <span className={cn('text-sm', done || current ? 'font-semibold text-ink' : 'text-ink-muted')}>
              {t(`tracker.${stage}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function nextStep(profile, t) {
  if (profile.status === 'submitted' || profile.status === 'under_review') {
    return { title: t('next.reviewTitle'), text: t('next.reviewText'), to: '/learner/programmes', cta: t('next.browse') };
  }
  if (profile.status === 'pathway_published') {
    return { title: t('next.pathwayTitle'), text: t('next.pathwayText'), to: '/learner/pathway', cta: t('next.viewPathway') };
  }
  if (profile.canSubmit) {
    return { title: t('next.submitTitle'), text: t('next.submitText'), to: '/learner/profile?step=review', cta: t('next.submit') };
  }
  if (profile.learnerType === 'employee' && profile.completionPercent >= 80) {
    return { title: t('next.orgTitle'), text: t('next.orgText'), to: '/learner/profile?step=review', cta: t('next.review') };
  }
  return { title: t('next.completeTitle'), text: t('next.completeText'), to: '/learner/profile', cta: t('next.complete') };
}

export default function LearnerDashboard() {
  const { t, i18n } = useTranslation('learner');
  const { user, organization } = useAuth();
  const query = useMyProfile();
  const enrollments = useMyEnrollments();
  const active = (enrollments.data ?? []).filter((e) => ['active', 'payment_pending'].includes(e.status));

  if (query.isPending) return <PageSpinner />;
  if (query.isError) return <QueryError query={query} />;
  const profile = query.data;
  const next = profile ? nextStep(profile, t) : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">{t('title')}</p>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('dashboard.greeting', { name: user?.name })}</h1>
        </div>
        {organization && (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
            {organization.logo?.url && <img src={organization.logo.url} alt="" className="h-9 w-9 rounded-lg object-contain" />}
            <div>
              <p className="text-xs text-ink-muted">{t('dashboard.organization')}</p>
              <p className="text-sm font-semibold">{organization.name}</p>
            </div>
          </div>
        )}
      </div>

      {profile && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">{t('dashboard.journey')}</h2>
                <StatusBadge status={profile.status} />
              </div>
              <StatusTracker status={profile.status} />
              <ProgressBar value={profile.completionPercent} label={t('dashboard.completion')} />
            </Card>

            <Card className="flex flex-col bg-emerald text-white">
              <h2 className="font-display text-lg font-semibold">{next.title}</h2>
              <p className="mt-2 flex-1 text-sm text-white">{next.text}</p>
              <Button
                as={Link}
                to={next.to}
                variant="secondary"
                className="mt-4 self-start"
                rightIcon={<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />}
              >
                {next.cta}
              </Button>
            </Card>
          </div>

          <ReadOnlyRemarks remarks={profile.orgRemarks} />

          {active.length > 0 && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">{t('dashboard.activeCourses')}</h2>
                <Button as={Link} to="/learner/learning" variant="ghost" size="sm">
                  {t('dashboard.viewAll')}
                </Button>
              </div>
              <ul className="space-y-4">
                {active.map((e) => (
                  <li key={e.id} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{loc(e.programme.title, i18n.resolvedLanguage)}</p>
                      <StatusBadge status={e.status} />
                    </div>
                    {e.status === 'active' ? (
                      <ProgressBar value={e.progressPercent} ariaLabel={loc(e.programme.title, i18n.resolvedLanguage)} />
                    ) : (
                      <p className="text-sm text-warning">{t('dashboard.paymentPending')}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mint-soft text-emerald">
                <BookOpen size={24} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">{t('dashboard.exploreTitle')}</p>
                <p className="text-sm text-ink-muted">{t('dashboard.exploreText')}</p>
              </div>
            </div>
            <Button as={Link} to="/learner/programmes" variant="outline">
              {t('dashboard.exploreCta')}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}
