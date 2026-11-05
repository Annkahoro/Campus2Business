import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { toast } from '../ui/index.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import NotificationBell from '../../features/notifications/NotificationBell.jsx';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

/** Topbar: menu button (mobile), language switcher, notification bell, user chip, logout. */
export default function Topbar({ onMenuClick }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success(t('auth:logoutSuccess'));
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 md:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={t('nav.openMenu')}
        className="rounded-lg p-2 text-ink hover:bg-mint-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald lg:hidden"
      >
        <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <LanguageSwitcher />
        <NotificationBell />

        <div className="hidden items-center gap-3 border-l border-line pl-3 sm:flex">
          {user?.avatar?.url ? (
            <img src={user.avatar.url} alt="" className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-mint text-sm font-semibold text-emerald-darker"
            >
              {initials(user?.name)}
            </span>
          )}
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink">{user?.name}</p>
            <p className="text-xs text-ink-muted">{t(`roles.${user?.role}`)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          aria-label={t('nav.logout')}
          title={t('nav.logout')}
          className="rounded-lg p-2 text-ink-muted hover:bg-mint-soft hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
        >
          <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
