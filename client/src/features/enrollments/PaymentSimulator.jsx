import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, CreditCard, Landmark, ShieldAlert, Smartphone } from 'lucide-react';
import { Alert, Button, Input, Modal, toast } from '../../components/ui/index.js';
import { formatPrice } from '../programmes/format.js';
import { loc } from '../../lib/localized.js';
import { cn } from '../../lib/cn.js';
import { PAYMENT_DELAY_MS } from './constants.js';
import { usePayEnrollment } from './hooks.js';

const ICONS = { card: CreditCard, mpesa: Smartphone, bank: Landmark, employer_invoice: Building2 };

/**
 * DEMO payment (docs/07 §4): pick card / M-Pesa / bank / employer invoice, fake 1.5 s processing,
 * then POST /enrollments/:id/pay. No real money and no card data is ever sent.
 */
export default function PaymentSimulator({ enrollment, open, onClose }) {
  const { t, i18n } = useTranslation('learning');
  const lang = i18n.resolvedLanguage;
  const isEmployee = !!enrollment?.organization;
  const methods = isEmployee ? ['employer_invoice', 'card', 'mpesa', 'bank'] : ['card', 'mpesa', 'bank'];
  const [method, setMethod] = useState(methods[0]);
  const [processing, setProcessing] = useState(false);
  const pay = usePayEnrollment();

  if (!enrollment) return null;
  const amount = formatPrice({ amount: enrollment.payment.amount, currency: enrollment.payment.currency }, lang, t);

  const submit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    await new Promise((r) => setTimeout(r, PAYMENT_DELAY_MS));
    try {
      const res = await pay.mutateAsync({ id: enrollment.id, method });
      toast.success(t('payment.success', { reference: res.payment.reference }));
      onClose();
    } catch (err) {
      toast.apiError(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={processing ? undefined : onClose}
      title={t('payment.title')}
      description={loc(enrollment.programme.title, lang)}
      size="md"
    >
      <form onSubmit={submit} className="space-y-5">
        <Alert variant="warning" title={t('payment.demoTitle')}>
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            {t('payment.demoText')}
          </span>
        </Alert>

        <div className="flex items-baseline justify-between rounded-xl bg-cream p-4">
          <span className="text-ink-muted">{t('payment.amount')}</span>
          <span className="font-display text-2xl font-bold text-emerald">{amount}</span>
        </div>

        <fieldset className="space-y-2" disabled={processing}>
          <legend className="mb-2 text-sm font-semibold">{t('payment.method')}</legend>
          {methods.map((m) => {
            const Icon = ICONS[m];
            return (
              <label
                key={m}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl border p-3 focus-within:ring-2 focus-within:ring-emerald',
                  method === m ? 'border-emerald bg-mint-soft' : 'border-line bg-surface hover:border-emerald',
                )}
              >
                <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} className="accent-emerald" />
                <Icon size={20} strokeWidth={1.75} className="text-emerald" aria-hidden="true" />
                <span>
                  <span className="block font-medium">{t(`payment.methods.${m}`)}</span>
                  <span className="block text-xs text-ink-muted">{t(`payment.methodHints.${m}`)}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {method === 'mpesa' && <Input label={t('payment.phone')} placeholder="07XX XXX XXX" disabled={processing} hint={t('payment.notSent')} />}
        {method === 'card' && <Input label={t('payment.cardName')} disabled={processing} hint={t('payment.notSent')} />}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={processing}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" loading={processing}>
            {processing ? t('payment.processing') : t('payment.pay', { amount })}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
