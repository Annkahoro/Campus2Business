import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import { useTranslation } from 'react-i18next';
import Topbar from '../components/layout/Topbar.jsx';
import ErrorBoundary from '../components/shared/ErrorBoundary.jsx';

/** Shared shell for the role layouts: 264px sidebar + topbar + content (docs/08 §6). */
export default function DashboardLayout({ navItems }) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile drawer on navigation.
  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-cream">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald focus:px-4 focus:py-2 focus:text-white">
        {t('nav.skipToContent')}
      </a>
      <Sidebar items={navItems} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="lg:pl-66">
        <Topbar onMenuClick={() => setDrawerOpen(true)} />
        <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl p-4 focus:outline-none md:p-8">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
