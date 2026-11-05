import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '../../components/ui/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor } from '../../lib/roles.js';

/** 404 — public pages, and unknown paths inside a role area (`inApp`). */
export default function NotFound({ inApp = false }) {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const home = isAuthenticated ? homeFor(user) : '/';
  return (
    <div className={inApp ? 'py-10' : 'mx-auto max-w-7xl p-4 md:p-8'}>
      <EmptyState
        illustration={<Compass size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('notFound.title')}
        description={t('notFound.text')}
        action={
          <Button as={Link} to={home}>
            {isAuthenticated ? t('nav.myDashboard') : t('notFound.action')}
          </Button>
        }
      />
    </div>
  );
}
