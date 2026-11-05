import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, EmptyState, PageSpinner } from '../components/ui/index.js';

/** Requires a logged-in user. Guests are sent to /login and returned afterwards. */
export default function ProtectedRoute({ children }) {
  const { status, refetchMe } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (status === 'loading') return <PageSpinner />;

  if (status === 'error') {
    return (
      <EmptyState
        className="min-h-screen justify-center"
        illustration={<WifiOff size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('sessionError.title')}
        description={t('sessionError.text')}
        action={<Button onClick={() => refetchMe()}>{t('actions.retry')}</Button>}
      />
    );
  }

  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;

  return children ?? <Outlet />;
}
