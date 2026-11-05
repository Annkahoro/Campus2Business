import { useTranslation } from 'react-i18next';
import Badge from '../ui/Badge.jsx';

/** Status → solid soft colour map (docs/08 §5). Labels come from common:status.*. */
const VARIANT = {
  draft: 'neutral',
  pending: 'pending',
  submitted: 'pending',
  under_review: 'info',
  requested: 'pending',
  payment_pending: 'pending',
  approved: 'success',
  published: 'success',
  completed: 'success',
  pathway_published: 'success',
  complete: 'soft',
  rejected: 'danger',
  failed: 'danger',
  suspended: 'danger',
  dropped: 'danger',
  archived: 'neutral',
  active: 'active',
  generating: 'info',
  pending_review: 'pending',
};

export default function StatusBadge({ status, className }) {
  const { t } = useTranslation();
  return (
    <Badge variant={VARIANT[status] ?? 'neutral'} className={className}>
      {t(`status.${status}`, { defaultValue: status })}
    </Badge>
  );
}
