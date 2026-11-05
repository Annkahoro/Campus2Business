import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { homeFor } from '../lib/roles.js';
import { Button, EmptyState } from '../components/ui/index.js';

/**
 * Allows only the given roles. Must be nested inside <ProtectedRoute>.
 * The UI check is a convenience: the API enforces roles too (authorize middleware).
 */
export default function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user || !roles.includes(user.role)) {
    return (
      <EmptyState
        className="min-h-screen justify-center"
        illustration={<ShieldX size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('forbidden.title')}
        description={t('forbidden.text')}
        action={
          <Button as={Link} to={homeFor(user)}>
            {t('forbidden.action')}
          </Button>
        }
      />
    );
  }

  return children ?? <Outlet />;
}
