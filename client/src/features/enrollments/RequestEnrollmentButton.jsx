import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, ExternalLink, ShoppingCart } from 'lucide-react';
import { Alert, Button, Modal, Select, toast } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDateRange, formatTimeRange, priceLabel } from '../programmes/format.js';
import { loc } from '../../lib/localized.js';
import { OPEN_STATUSES } from './constants.js';
import { useRequestEnrollment, useStartCheckout } from './hooks.js';

const upcoming = (programme) =>
  (programme?.intakes ?? []).filter((i) => new Date(i.startDate).getTime() >= Date.now()).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

/** Pending purchase on the campus2b.com shop: send the learner back to the checkout. */
export function ContinueCheckoutButton({ enrollment, size = 'sm' }) {
  const { t } = useTranslation('learning');
  if (!enrollment?.payment?.checkoutUrl) return null;
  return (
    <Button as="a" href={enrollment.payment.checkoutUrl} size={size} rightIcon={<ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />}>
      {t('checkout.continue')}
    </Button>
  );
}

/**
 * Enroll button (docs/09). Shows the current status instead when the learner already has an open or
 * completed enrollment for this programme.
 * - Paid programme with a campus2b.com shop product (programme.shopCheckout), learner acting for themselves:
 *   "Buy on campus2b.com" → the C2B website checkout. The payment there activates the course (webhook).
 * - Otherwise "Request enrollment" → C2B approval (free/subsidised programmes, or no shop product).
 * - learner: pass `enrollments` (from useMyEnrollments)
 * - org admin: pass `learnerId` (enroll on behalf) and that employee's `enrollments`
 */
export default function RequestEnrollmentButton({ programme, enrollments = [], recommendationId, learnerId, size = 'sm', variant = 'primary', learnerLink = '/learner/learning' }) {
  const { t, i18n } = useTranslation('learning');
  const lang = i18n.resolvedLanguage;
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const intakes = upcoming(programme);
  const [intake, setIntake] = useState('');
  const request = useRequestEnrollment();
  const checkout = useStartCheckout();
  const [redirecting, setRedirecting] = useState(false);

  if (!programme?.id) return null;
  const existing = enrollments.find(
    (e) => e.programme.id === programme.id && (OPEN_STATUSES.includes(e.status) || e.status === 'completed'),
  );
  if (existing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link to={learnerLink} className="inline-flex items-center gap-2 text-sm font-medium text-emerald hover:underline">
          <StatusBadge status={existing.status} />
          {!learnerId && t('request.viewInLearning')}
        </Link>
        {!learnerId && <ContinueCheckoutButton enrollment={existing} size={size} />}
      </div>
    );
  }

  const buy = !learnerId && !!programme.shopCheckout;
  const pending = request.isPending || checkout.isPending || redirecting;

  const submit = async () => {
    const intakeStartDate = intake || undefined;
    try {
      if (buy) {
        const res = await checkout.mutateAsync({ programmeId: programme.id, intakeStartDate, recommendationId });
        setRedirecting(true);
        window.location.assign(res.checkoutUrl); // the C2B website checkout with this course in the cart
        return;
      }
      await request.mutateAsync({ programmeId: programme.id, intakeStartDate, recommendationId, learnerId });
      toast.success(learnerId ? t('request.sentOnBehalf') : t('request.sent'));
      setOpen(false);
    } catch (err) {
      toast.apiError(err);
    }
  };

  const price = priceLabel(programme, lang, t);
  const title = buy ? t('checkout.title') : learnerId ? t('request.titleOnBehalf') : t('request.title');
  const ButtonIcon = buy ? ShoppingCart : CalendarPlus;

  return (
    <>
      <Button size={size} variant={variant} onClick={() => setOpen(true)} leftIcon={<ButtonIcon size={16} strokeWidth={1.75} aria-hidden="true" />}>
        {buy ? t('checkout.button') : learnerId ? t('request.enrollOnBehalf') : t('request.button')}
      </Button>
      <Modal
        open={open}
        onClose={pending ? undefined : () => setOpen(false)}
        title={title}
        description={loc(programme.title, lang)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t('actions.cancel')}
            </Button>
            <Button
              onClick={submit}
              loading={pending}
              rightIcon={buy ? <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" /> : undefined}
            >
              {buy ? t('checkout.confirm') : t('request.confirm')}
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
            <p className="text-sm text-ink-muted">
              {programme.catalogue === 'elearning' ? (buy ? t('checkout.selfPaced') : t('request.selfPaced')) : t('request.noIntakes')}
            </p>
          )}

          {buy ? (
            <>
              <div className="flex items-baseline justify-between rounded-xl bg-cream p-4">
                <span className="text-ink-muted">{t('checkout.price')}</span>
                <span className="font-display text-2xl font-bold text-emerald">{price}</span>
              </div>
              <p className="text-sm text-ink-muted">{t('checkout.explain')}</p>
              <Alert variant="info" title={t('checkout.sameEmailTitle')}>
                {t('checkout.sameEmail', { email: user?.email ?? '' })}
              </Alert>
              <p className="text-xs text-ink-muted">{t('checkout.cartNote')}</p>
            </>
          ) : (
            <>
              {price && (
                <p className="text-sm text-ink-muted">
                  {programme.subsidised ? t('request.subsidisedNote') : t('request.priceNote', { price })}
                </p>
              )}
              <p className="text-sm text-ink-muted">{t('request.explain')}</p>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
