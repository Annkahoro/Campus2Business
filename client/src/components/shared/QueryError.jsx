import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Button, EmptyState } from '../ui/index.js';
import { getErrorMessage } from '../../lib/axios.js';

/** Standard error state for a failed query: translated message (by error code) + retry. */
export default function QueryError({ query, title }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
      title={title ?? t('loadFailed')}
      description={query?.error ? getErrorMessage(query.error) : undefined}
      action={<Button onClick={() => query?.refetch()}>{t('actions.retry')}</Button>}
    />
  );
}
