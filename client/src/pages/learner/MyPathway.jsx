import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ChevronDown, Route, Star } from 'lucide-react';
import { Button, Card, EmptyState, PageSpinner, Textarea, toast } from '../../components/ui/index.js';
import { useMyPathway, usePathwayFeedback } from '../../features/recommendations/hooks.js';
import PathwayOverview from '../../features/recommendations/PathwayOverview.jsx';
import PathwayTimeline from '../../features/recommendations/PathwayTimeline.jsx';
import { useMyProfile } from '../../features/profile/hooks.js';
import { useMyEnrollments } from '../../features/enrollments/hooks.js';
import RequestEnrollmentButton from '../../features/enrollments/RequestEnrollmentButton.jsx';
import { formatDate } from '../../features/programmes/format.js';
import { cn } from '../../lib/cn.js';

const programmeHref = (id) => `/learner/programmes/${id}`;

/** 1–5 star rating + optional comment for the current pathway. */
function FeedbackCard({ feedback }) {
  const { t } = useTranslation('pathway');
  const save = usePathwayFeedback();
  const [rating, setRating] = useState(feedback?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(feedback?.comment ?? '');

  const submit = (e) => {
    e.preventDefault();
    if (!rating) return;
    save.mutate(
      { rating, comment },
      { onSuccess: () => toast.success(t('feedback.saved')), onError: toast.apiError },
    );
  };

  return (
    <Card as="form" onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">{t('feedback.title')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('feedback.subtitle')}</p>
      </div>
      <fieldset>
        <legend className="sr-only">{t('feedback.ratingLabel')}</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = n <= (hover || rating);
            return (
              <label
                key={n}
                className="cursor-pointer rounded-lg p-1 focus-within:ring-2 focus-within:ring-emerald"
                onMouseEnter={() => setHover(n)}
              >
                <input
                  type="radio"
                  name="rating"
                  value={n}
                  checked={rating === n}
                  onChange={() => setRating(n)}
                  className="sr-only"
                />
                <span className="sr-only">{t('feedback.stars', { count: n })}</span>
                <Star
                  size={28}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className={cn(filled ? 'fill-emerald text-emerald' : 'text-line')}
                />
              </label>
            );
          })}
        </div>
      </fieldset>
      <Textarea
        label={t('feedback.comment')}
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={!rating} loading={save.isPending}>
          {feedback ? t('feedback.update') : t('feedback.submit')}
        </Button>
      </div>
    </Card>
  );
}

/** /learner/pathway — empty until a pathway is published (docs/09). */
export default function MyPathway() {
  const { t, i18n } = useTranslation('pathway');
  const query = useMyPathway();
  const profile = useMyProfile();
  const enrollments = useMyEnrollments();

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

  const { current, previous } = query.data;
  const status = profile.data?.status;

  if (!current) {
    const waiting = ['submitted', 'under_review'].includes(status);
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('title')}</h1>
        <Card>
          <EmptyState
            illustration={<Route size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={waiting ? t('empty.waitingTitle') : t('empty.title')}
            description={waiting ? t('empty.waitingText') : t('empty.text')}
            action={
              !waiting && (
                <Button as={Link} to="/learner/profile">
                  {t('empty.cta')}
                </Button>
              )
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="mt-1 text-ink-muted">
            {t('publishedOn', { date: formatDate(current.publishedAt, i18n.resolvedLanguage), version: current.version })}
          </p>
        </div>
        {status === 'complete' && (
          <p className="max-w-sm text-sm text-ink-muted">{t('editedNotice')}</p>
        )}
      </div>

      <PathwayOverview
        pathway={current}
        programmeHref={programmeHref}
        renderAction={(step) =>
          !step.programme?.missing && (
            <RequestEnrollmentButton programme={step.programme} enrollments={enrollments.data ?? []} recommendationId={current.id} />
          )
        }
      />

      <FeedbackCard key={current.id} feedback={current.feedback} />

      {previous.length > 0 && (
        <section aria-labelledby="previous-versions" className="space-y-3">
          <h2 id="previous-versions" className="font-display text-xl font-semibold">
            {t('previousVersions')}
          </h2>
          {previous.map((v) => (
            <details key={v.id} className="group rounded-[var(--radius-card)] border border-line bg-surface">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald">
                {t('versionN', { version: v.version, date: formatDate(v.publishedAt, i18n.resolvedLanguage) })}
                <ChevronDown size={18} strokeWidth={1.75} className="transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-line p-4">
                <PathwayTimeline steps={v.pathway} programmeHref={programmeHref} />
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
