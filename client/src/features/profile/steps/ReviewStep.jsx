import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Send } from 'lucide-react';
import { Alert, Button, ProgressBar, toast } from '../../../components/ui/index.js';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import ProfileSummary from '../ProfileSummary.jsx';
import ReadOnlyRemarks from '../ReadOnlyRemarks.jsx';
import { SUBMIT_THRESHOLD } from '../constants.js';
import { useSubmitProfile } from '../hooks.js';
import { StepHeader } from './StepParts.jsx';

const SECTION_ORDER = ['personal', 'education', 'employment', 'skills', 'goals', 'cv'];

export default function ReviewStep({ profile, goTo }) {
  const { t } = useTranslation('profile');
  const submit = useSubmitProfile();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isStudent = profile.learnerType === 'student';
  const incomplete = SECTION_ORDER.filter((s) => (profile.sections?.[s] ?? 0) < 1);

  const doSubmit = () =>
    submit.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success(t('review.submitted'));
      },
      onError: (err) => {
        setConfirmOpen(false);
        toast.apiError(err);
      },
    });

  return (
    <div className="space-y-6">
      <StepHeader title={t('steps.review.title')} description={t('steps.review.description')} />

      <ReadOnlyRemarks remarks={profile.orgRemarks} />

      <div className="rounded-xl border border-line bg-cream p-5">
        <ProgressBar value={profile.completionPercent} label={t('review.completion')} />
        {incomplete.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-ink-muted">{t('review.improve')}</p>
            <div className="flex flex-wrap gap-2">
              {incomplete.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => goTo(s)}>
                  {t(`steps.${s}.title`)}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isStudent && profile.status === 'submitted' && (
        <Alert variant="success" title={t('review.submittedTitle')}>
          {t('review.submittedText')}
        </Alert>
      )}

      {isStudent && ['draft', 'complete', 'pathway_published'].includes(profile.status) && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald/30 bg-mint-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-emerald-darker">
              {profile.canSubmit ? t('review.readyTitle') : t('review.notReadyTitle', { threshold: SUBMIT_THRESHOLD })}
            </p>
            <p className="text-sm text-emerald-darker">{profile.canSubmit ? t('review.readyText') : t('review.notReadyText')}</p>
          </div>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!profile.canSubmit}
            leftIcon={<Send size={18} strokeWidth={1.75} aria-hidden="true" />}
          >
            {t('review.submit')}
          </Button>
        </div>
      )}

      {!isStudent && (
        <Alert variant="info" title={t('review.employeeTitle')}>
          {profile.completionPercent >= SUBMIT_THRESHOLD ? (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
              {t('review.employeeReady')}
            </span>
          ) : (
            t('review.employeeText', { threshold: SUBMIT_THRESHOLD })
          )}
        </Alert>
      )}

      <ProfileSummary profile={profile} onEdit={profile.isLocked ? undefined : goTo} />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        loading={submit.isPending}
        variant="primary"
        title={t('review.confirmTitle')}
        description={t('review.confirmText')}
        confirmLabel={t('review.submit')}
      />
    </div>
  );
}
