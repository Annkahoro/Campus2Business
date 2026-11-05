import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Building2, FileText, MessageSquare } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, PageSpinner, ProgressBar, Tabs } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import ProfileSummary from '../../features/profile/ProfileSummary.jsx';
import GenerateButton from '../../features/recommendations/GenerateButton.jsx';
import { useLearner } from '../../features/recommendations/hooks.js';
import { formatDate } from '../../features/programmes/format.js';
import { loc } from '../../lib/localized.js';

const TABS = ['profile', 'cv', 'remarks', 'history', 'pathways'];

/** /admin/learners/:id — Profile · CV · Org remarks · History · Pathways + "Generate pathway" (docs/09). */
export default function LearnerDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation('pathway');
  const lang = i18n.resolvedLanguage;
  const query = useLearner(id);
  const [tab, setTab] = useState('profile');

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return (
      <EmptyState
        illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('learners.notFound')}
        action={
          <Button as={Link} to="/admin/learners">
            {t('learners.back')}
          </Button>
        }
      />
    );
  }

  const { learner, organization, profile, recommendations, history, canGenerate, isGenerating } = query.data;
  const hasPublished = recommendations.some((r) => r.status === 'published');
  const generating = recommendations.find((r) => r.status === 'generating');

  return (
    <div className="space-y-6">
      <Button as={Link} to="/admin/learners" variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}>
        {t('learners.back')}
      </Button>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {learner.avatar?.url ? (
              <img src={learner.avatar.url} alt="" className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint font-display text-xl font-bold text-emerald-darker">
                {learner.name[0]?.toUpperCase()}
              </span>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold">{learner.name}</h1>
              <p className="text-sm text-ink-muted">{learner.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={learner.type === 'employee' ? 'info' : 'soft'}>{t(`learners.types.${learner.type}`)}</Badge>
                {organization && (
                  <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
                    <Building2 size={14} strokeWidth={1.75} aria-hidden="true" />
                    {organization.name}
                    {learner.department && ` · ${learner.department}`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <StatusBadge status={learner.isActive ? profile.status : 'suspended'} />
        </div>

        <ProgressBar value={profile.completionPercent} label={t('learners.columns.completion')} />

        {isGenerating ? (
          <Alert variant="info">
            {t('admin.generatingNotice')}{' '}
            <Link to={`/admin/recommendations/${generating.id}`} className="font-semibold underline">
              {t('admin.openDraft')}
            </Link>
          </Alert>
        ) : (
          !canGenerate && <Alert variant="info">{t('admin.cannotGenerate')}</Alert>
        )}

        <div className="flex flex-wrap gap-3">
          <GenerateButton learnerId={learner.id} disabled={!canGenerate || isGenerating} regenerate={recommendations.length > 0} />
          {hasPublished && (
            <Button
              as={Link}
              variant="outline"
              to={`/admin/recommendations/${recommendations.find((r) => r.status === 'published').id}`}
            >
              {t('admin.viewPublished')}
            </Button>
          )}
        </div>
      </Card>

      <Tabs
        label={t('learners.tabsLabel')}
        value={tab}
        onChange={setTab}
        tabs={TABS.map((v) => ({
          value: v,
          label: t(`learners.tabs.${v}`),
          badge:
            v === 'remarks' && profile.orgRemarks.length ? (
              <Badge>{profile.orgRemarks.length}</Badge>
            ) : v === 'pathways' && recommendations.length ? (
              <Badge>{recommendations.length}</Badge>
            ) : null,
        }))}
      />

      {tab === 'profile' && <ProfileSummary profile={profile} />}

      {tab === 'cv' && (
        <Card>
          {profile.cv ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText size={28} strokeWidth={1.75} className="text-emerald" aria-hidden="true" />
                <div>
                  <p className="font-medium">{profile.cv.fileName}</p>
                  <p className="text-sm text-ink-muted">{formatDate(profile.cv.uploadedAt, lang)}</p>
                </div>
              </div>
              <Button as="a" href={profile.cv.url} target="_blank" rel="noopener noreferrer" variant="outline">
                {t('learners.openCv')}
              </Button>
            </div>
          ) : (
            <EmptyState illustration={<FileText size={32} strokeWidth={1.75} aria-hidden="true" />} title={t('learners.noCv')} />
          )}
        </Card>
      )}

      {tab === 'remarks' && (
        <Card>
          {profile.orgRemarks.length === 0 ? (
            <EmptyState illustration={<MessageSquare size={32} strokeWidth={1.75} aria-hidden="true" />} title={t('learners.noRemarks')} />
          ) : (
            <ul className="space-y-3">
              {profile.orgRemarks.map((r) => (
                <li key={r.id} className="rounded-xl border border-line bg-cream p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="soft">{t(`remarks.categories.${r.category}`, { ns: 'profile', defaultValue: r.category })}</Badge>
                    <span className="text-xs text-ink-muted">
                      {[r.authorName, formatDate(r.updatedAt ?? r.createdAt, lang)].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <p className="mt-2 text-ink">{r.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'history' && (
        <Card>
          {history.length === 0 ? (
            <EmptyState illustration={<FileText size={32} strokeWidth={1.75} aria-hidden="true" />} title={t('learners.noHistory')} />
          ) : (
            <ul className="divide-y divide-line">
              {history.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{loc(e.programme?.title, lang)}</p>
                    <p className="text-xs text-ink-muted">
                      {[e.programme?.code, e.score !== null && t('learners.score', { score: e.score })].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'pathways' && (
        <Card padded={false}>
          {recommendations.length === 0 ? (
            <div className="p-6">
              <EmptyState illustration={<FileText size={32} strokeWidth={1.75} aria-hidden="true" />} title={t('learners.noPathways')} />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recommendations.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/admin/recommendations/${r.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-mint-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                  >
                    <div>
                      <p className="font-medium">{t('versionShort', { version: r.version })}</p>
                      <p className="text-xs text-ink-muted">
                        {formatDate(r.createdAt, lang)}
                        {r.steps ? ` · ${t('stepsCount', { count: r.steps })}` : ''}
                        {r.rejectionReason === 'SUPERSEDED' ? ` · ${t('admin.superseded')}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
