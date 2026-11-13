import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';
import { Button, Modal, Select, toast } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { formatDateRange, formatTimeRange, priceLabel } from '../programmes/format.js';
import { loc } from '../../lib/localized.js';
import { OPEN_STATUSES } from './constants.js';
import { useRequestEnrollment } from './hooks.js';

const upcoming = (programme) =>
  (programme?.intakes ?? []).filter((i) => new Date(i.startDate).getTime() >= Date.now()).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

/**
 * "Request enrollment" (docs/09). Shows the current status instead when the learner already has
 * an open or completed enrollment for this programme.
 * - learner: pass `enrollments` (from useMyEnrollments)
 * - org admin: pass `learnerId` (enroll on behalf) and that employee's `enrollments`
 */
export default function RequestEnrollmentButton({ programme, enrollments = [], recommendationId, learnerId, size = 'sm', variant = 'primary', learnerLink = '/learner/learning' }) {
  const { t, i18n } = useTranslation('learning');
  const lang = i18n.resolvedLanguage;
  const [open, setOpen] = useState(false);
  const intakes = upcoming(programme);
  const [intake, setIntake] = useState('');
  const request = useRequestEnrollment();

  if (!programme?.id) return null;
  const existing = enrollments.find(
    (e) => e.programme.id === programme.id && (OPEN_STATUSES.includes(e.status) || e.status === 'completed'),
  );
  if (existing) {
    return (
      <Link to={learnerLink} className="inline-flex items-center gap-2 text-sm font-medium text-emerald hover:underline">
        <StatusBadge status={existing.status} />
        {!learnerId && t('request.viewInLearning')}
      </Link>
    );
  }

  const submit = async () => {
    try {
      await request.mutateAsync({
        programmeId: programme.id,
        intakeStartDate: intake || undefined,
        recommendationId,
        learnerId,
      });
      toast.success(learnerId ? t('request.sentOnBehalf') : t('request.sent'));
      setOpen(false);
    } catch (err) {
      toast.apiError(err);
    }
  };

  const price = priceLabel(programme, lang, t);

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)} leftIcon={<CalendarPlus size={16} strokeWidth={1.75} aria-hidden="true" />}>
        {learnerId ? t('request.enrollOnBehalf') : t('request.button')}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={learnerId ? t('request.titleOnBehalf') : t('request.title')}
        description={loc(programme.title, lang)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={request.isPending}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={submit} loading={request.isPending}>
              {t('request.confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {intakes.length > 0 ? (
            <Select
              label={t('request.intake')}
              value={intake}
              onChange={(e) => setIntake(e.target.value)}
              options={[
                { value: '', label: t('request.anyIntake') },
                ...intakes.map((i) => ({
                  value: new Date(i.startDate).toISOString(),
                  label: [formatDateRange(i, lang), formatTimeRange(i), i.location].filter(Boolean).join(' · '),
                })),
              ]}
            />
          ) : (
            <p className="text-sm text-ink-muted">{programme.catalogue === 'elearning' ? t('request.selfPaced') : t('request.noIntakes')}</p>
          )}
          {price && (
            <p className="text-sm text-ink-muted">
              {programme.subsidised ? t('request.subsidisedNote') : t('request.priceNote', { price })}
            </p>
          )}
          <p className="text-sm text-ink-muted">{t('request.explain')}</p>
        </div>
      </Modal>
    </>
  );
}
