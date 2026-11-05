import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Hourglass } from 'lucide-react';
import { Alert, Button, Card } from '../../components/ui/index.js';

/** Pending / rejected / suspended notices for the org admin (docs/04 §3, docs/09 org dashboard). */
export default function OrgStatusNotice({ organization, compact = false }) {
  const { t } = useTranslation('org');
  const { status } = organization;

  if (status === 'pending') {
    if (compact) return <Alert variant="warning" title={t('status.pendingTitle')}>{t('status.pendingShort')}</Alert>;
    return (
      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-dark text-warning">
          <Hourglass size={32} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h2 className="font-display text-xl font-semibold">{t('status.pendingTitle')}</h2>
        <p className="max-w-lg text-ink-muted">{t('status.pendingText')}</p>
        <Button as={Link} to="/org/organization" variant="outline">
          {t('status.reviewDetails')}
        </Button>
      </Card>
    );
  }
  if (status === 'rejected') {
    return (
      <Alert variant="danger" title={t('status.rejectedTitle')}>
        <p>{t('status.rejectedText')}</p>
        {organization.rejectionReason && (
          <p className="mt-2 rounded-lg bg-surface p-3 text-ink">
            <span className="font-semibold">{t('status.reason')}: </span>
            {organization.rejectionReason}
          </p>
        )}
        {!compact && (
          <Button as={Link} to="/org/organization" size="sm" className="mt-3">
            {t('status.editResubmit')}
          </Button>
        )}
      </Alert>
    );
  }
  if (status === 'suspended') {
    return <Alert variant="warning" title={t('status.suspendedTitle')}>{t('status.suspendedText')}</Alert>;
  }
  return null;
}
