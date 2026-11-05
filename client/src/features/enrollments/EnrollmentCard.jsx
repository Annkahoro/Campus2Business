import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, Star } from 'lucide-react';
import { Button, Card, ProgressBar, Textarea, toast } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { formatDate, formatPrice } from '../programmes/format.js';
import { loc } from '../../lib/localized.js';
import { cn } from '../../lib/cn.js';
import { useRateEnrollment } from './hooks.js';

function StarRating({ value, onChange, label }) {
  const { t } = useTranslation('learning');
  const [hover, setHover] = useState(0);
  return (
    <fieldset>
      <legend className="sr-only">{label}</legend>
      <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded p-0.5 focus-within:ring-2 focus-within:ring-emerald" onMouseEnter={() => setHover(n)}>
            <input type="radio" className="sr-only" checked={value === n} onChange={() => onChange(n)} />
            <span className="sr-only">{t('rate.stars', { count: n })}</span>
            <Star size={22} strokeWidth={1.75} aria-hidden="true" className={cn(n <= (hover || value) ? 'fill-emerald text-emerald' : 'text-line')} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function RateForm({ enrollment }) {
  const { t } = useTranslation('learning');
  const [rating, setRating] = useState(enrollment.learnerRating ?? 0);
  const [review, setReview] = useState(enrollment.learnerReview ?? '');
  const rate = useRateEnrollment();
  const save = () =>
    rate.mutate(
      { id: enrollment.id, body: { rating, review } },
      { onSuccess: () => toast.success(t('rate.saved')), onError: toast.apiError },
    );
  return (
    <div className="space-y-3 rounded-xl bg-cream p-4">
      <p className="text-sm font-semibold">{enrollment.learnerRating ? t('rate.yourRating') : t('rate.title')}</p>
      <StarRating value={rating} onChange={setRating} label={t('rate.title')} />
      <Textarea label={t('rate.review')} rows={2} value={review} onChange={(e) => setReview(e.target.value)} maxLength={1000} />
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={!rating} loading={rate.isPending}>
          {enrollment.learnerRating ? t('rate.update') : t('rate.submit')}
        </Button>
      </div>
    </div>
  );
}

/** One enrollment on My Learning / org enrollments. `onPay` opens the PaymentSimulator. */
export default function EnrollmentCard({ enrollment: e, onPay, canRate = false, showLearner = false, programmeHref }) {
  const { t, i18n } = useTranslation('learning');
  const lang = i18n.resolvedLanguage;
  const title = loc(e.programme.title, lang);
  const amount = formatPrice({ amount: e.payment.amount, currency: e.payment.currency }, lang, t);

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {showLearner && <p className="text-sm font-semibold text-emerald">{e.learner.name}</p>}
          <h3 className="font-display text-lg font-semibold">
            {programmeHref ? (
              <Link to={programmeHref(e.programme.id)} className="hover:text-emerald hover:underline">
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          <p className="text-sm text-ink-muted">
            {[e.programme.code, e.intakeStartDate && t('card.intake', { date: formatDate(e.intakeStartDate, lang) })].filter(Boolean).join(' · ')}
          </p>
        </div>
        <StatusBadge status={e.status} />
      </div>

      {e.status === 'active' && <ProgressBar value={e.progressPercent} label={t('card.progress')} />}

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-muted">{t('card.price')}</dt>
          <dd className="font-medium">{amount ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{t('card.payment')}</dt>
          <dd className="font-medium">
            {t(`card.paymentStatus.${e.payment.status}`)}
            {e.payment.reference && <span className="block text-xs text-ink-muted">{e.payment.reference}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{e.completedAt ? t('card.completed') : e.startedAt ? t('card.started') : t('card.requested')}</dt>
          <dd className="font-medium">{formatDate(e.completedAt ?? e.startedAt ?? e.createdAt, lang)}</dd>
        </div>
        {e.score !== null && (
          <div>
            <dt className="text-ink-muted">{t('card.score')}</dt>
            <dd className="font-medium">{e.score}/100</dd>
          </div>
        )}
      </dl>

      {e.status === 'requested' && <p className="text-sm text-ink-muted">{t('card.waitingApproval')}</p>}
      {e.status === 'payment_pending' && onPay && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-cream-dark p-3">
          <p className="text-sm text-warning">{e.organization ? t('card.payPendingEmployee') : t('card.payPending')}</p>
          <Button size="sm" onClick={() => onPay(e)} leftIcon={<CreditCard size={16} strokeWidth={1.75} aria-hidden="true" />}>
            {t('card.payNow')}
          </Button>
        </div>
      )}
      {e.status === 'completed' && canRate && <RateForm enrollment={e} />}
      {e.status === 'completed' && !canRate && e.learnerRating && (
        <p className="text-sm text-ink-muted">{t('card.rated', { rating: e.learnerRating })}</p>
      )}
    </Card>
  );
}
