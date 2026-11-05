import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Alert, Button, Card, EmptyState, PageSpinner } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { useRecommendation } from '../../features/recommendations/hooks.js';
import ReviewEditor from '../../features/recommendations/ReviewEditor.jsx';
import PathwayOverview from '../../features/recommendations/PathwayOverview.jsx';
import GenerateButton from '../../features/recommendations/GenerateButton.jsx';
import { AiOriginalPanel, LearnerSnapshot } from '../../features/recommendations/ReviewSidePanels.jsx';
import { formatDate } from '../../features/programmes/format.js';

/** /admin/recommendations/:id — review editor (docs/06 §9, docs/09). */
export default function RecommendationReview() {
  const { id } = useParams();
  const { t, i18n } = useTranslation('pathway');
  const lang = i18n.resolvedLanguage;
  const query = useRecommendation(id);

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return (
      <EmptyState
        illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('review.notFound')}
        action={
          <Button as={Link} to="/admin/recommendations">
            {t('review.back')}
          </Button>
        }
      />
    );
  }

  const { recommendation: rec, learner } = query.data;
  const header = (
    <div className="space-y-3">
      <Button as={Link} to="/admin/recommendations" variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}>
        {t('review.back')}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('review.title', { name: learner.user.name })}</h1>
          <p className="mt-1 text-ink-muted">
            {t('review.meta', {
              version: rec.version,
              date: formatDate(rec.createdAt, lang),
              by: rec.generatedBy?.name ?? '—',
            })}
          </p>
        </div>
        <StatusBadge status={rec.status} />
      </div>
    </div>
  );

  if (rec.status === 'generating') {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <EmptyState
            illustration={<Loader2 size={32} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />}
            title={t('review.generatingTitle')}
            description={t('review.generatingText')}
          />
        </Card>
      </div>
    );
  }

  if (rec.status === 'failed') {
    return (
      <div className="space-y-6">
        {header}
        <Alert variant="danger" title={t('review.failedTitle')}>
          {rec.failureReason}
        </Alert>
        <GenerateButton learnerId={learner.user.id} regenerate />
      </div>
    );
  }

  const readOnly = !rec.isEditable;
  const view = {
    summary: rec.final.summary,
    strengths: rec.aiDraft.strengths,
    skillGaps: rec.aiDraft.skillGaps,
    pathway: rec.final.pathway,
    alternatives: rec.final.alternatives,
    adminNoteToLearner: rec.final.adminNoteToLearner,
  };

  return (
    <div className="space-y-6">
      {header}

      {rec.status === 'published' && (
        <Alert variant="success">{t('review.publishedNotice', { date: formatDate(rec.publishedAt, lang) })}</Alert>
      )}
      {rec.status === 'rejected' && (
        <Alert variant="warning" title={t('review.rejectedTitle')}>
          {rec.rejectionReason === 'SUPERSEDED' ? t('admin.superseded') : rec.rejectionReason}
        </Alert>
      )}
      {rec.learnerFeedback && (
        <Alert variant="info">
          {t('review.feedback', { rating: rec.learnerFeedback.rating })}
          {rec.learnerFeedback.comment && ` — “${rec.learnerFeedback.comment}”`}
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <LearnerSnapshot learner={learner} />
          <AiOriginalPanel recommendation={rec} />
        </aside>

        <div className="min-w-0">
          {readOnly ? (
            <div className="space-y-6">
              <PathwayOverview pathway={view} programmeHref={(pid) => `/admin/programmes/${pid}`} />
              {rec.internalNotes && (
                <Card>
                  <h2 className="font-display text-lg font-semibold">{t('editor.internalNotes')}</h2>
                  <p className="mt-2 whitespace-pre-line text-ink">{rec.internalNotes}</p>
                </Card>
              )}
              <div className="flex flex-wrap gap-3">
                <GenerateButton learnerId={learner.user.id} regenerate />
                <Button as={Link} to={`/admin/learners/${learner.user.id}`} variant="outline" leftIcon={<Sparkles size={18} strokeWidth={1.75} aria-hidden="true" />}>
                  {t('review.allVersions')}
                </Button>
              </div>
            </div>
          ) : (
            <ReviewEditor key={rec.id} data={query.data} />
          )}
        </div>
      </div>
    </div>
  );
}
