import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Button, EmptyState, PageSpinner } from '../../components/ui/index.js';
import ProfileWizard from '../../features/profile/ProfileWizard.jsx';
import { useMyProfile } from '../../features/profile/hooks.js';

/** /learner/profile */
export default function MyProfile() {
  const { t } = useTranslation('profile');
  const query = useMyProfile();

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
  return <ProfileWizard profile={query.data} />;
}
