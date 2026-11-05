import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import LanguageSwitcher from '../components/layout/LanguageSwitcher.jsx';
import { Button } from '../components/ui/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { homeFor } from '../lib/roles.js';
import { cn } from '../lib/cn.js';
import ErrorBoundary from '../components/shared/ErrorBoundary.jsx';
import logo from '../assets/images/brand/logo-c2b.svg';
import logoWhite from '../assets/images/brand/logo-c2b-white.svg';

/** Landing sections reachable from the navbar (docs/09 §Landing 1). */
const SECTION_LINKS = [
  { hash: '#about', key: 'nav.about' },
  { hash: '#students', key: 'nav.forStudents' },
  { hash: '#organizations', key: 'nav.forOrganizations' },
];

const linkCls =
  'rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-mint-soft hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald';

function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const footerLink = 'text-mint-soft hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint rounded';
  return (
    <footer className="bg-emerald-darker text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <img src={logoWhite} alt={t('appName')} className="h-10 w-auto" />
          <p className="mt-4 max-w-sm text-sm text-mint-soft">{t('footer.tagline')}</p>
        </div>
        <nav aria-label={t('footer.explore')}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-mint">{t('footer.explore')}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/programmes" className={footerLink}>{t('nav.programmes')}</Link></li>
            {SECTION_LINKS.map((l) => (
              <li key={l.hash}><Link to={{ pathname: '/', hash: l.hash }} className={footerLink}>{t(l.key)}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t('footer.getStarted')}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-mint">{t('footer.getStarted')}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/login" className={footerLink}>{t('nav.login')}</Link></li>
            <li><Link to="/register" className={footerLink}>{t('footer.studentAccount')}</Link></li>
            <li><Link to="/register-organization" className={footerLink}>{t('footer.registerOrg')}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-emerald">
        <p className="mx-auto max-w-7xl px-4 py-5 text-sm text-mint-soft md:px-8">
          © {year} Campus2Business · {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}

export default function PublicLayout() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on navigation.
  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);

  const nav = (mobile) => (
    <>
      {SECTION_LINKS.map((l) => (
        <Link key={l.hash} to={{ pathname: '/', hash: l.hash }} className={cn(linkCls, mobile && 'block')}>
          {t(l.key)}
        </Link>
      ))}
      <NavLink to="/programmes" className={({ isActive }) => cn(linkCls, mobile && 'block', isActive && 'text-emerald')}>
        {t('nav.programmes')}
      </NavLink>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald focus:px-4 focus:py-2 focus:text-white">
        {t('nav.skipToContent')}
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald">
            <img src={logo} alt={t('appName')} className="h-9 w-auto" />
          </Link>

          <nav aria-label={t('nav.mainNav')} className="hidden items-center gap-1 lg:flex">
            {nav(false)}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Button as={Link} to={homeFor(user)} size="sm">
                {t('nav.myDashboard')}
              </Button>
            ) : (
              <>
                <Button as={Link} to="/login" variant="ghost" size="sm">
                  {t('nav.login')}
                </Button>
                <Button as={Link} to="/register" size="sm" className="hidden sm:inline-flex">
                  {t('nav.getStarted')}
                </Button>
              </>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="public-mobile-nav"
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              className="rounded-lg p-2 text-ink hover:bg-mint-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald lg:hidden"
            >
              {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="public-mobile-nav" aria-label={t('nav.mainNav')} className="space-y-1 border-t border-line bg-surface px-4 py-3 lg:hidden">
            {nav(true)}
            {!isAuthenticated && (
              <Link to="/register-organization" className={cn(linkCls, 'block')}>
                {t('footer.registerOrg')}
              </Link>
            )}
          </nav>
        )}
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
