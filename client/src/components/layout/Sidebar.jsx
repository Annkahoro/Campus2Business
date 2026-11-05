import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import logoWhite from '../../assets/images/brand/logo-c2b-white.svg';

/**
 * Emerald sidebar (docs/08 §5). Fixed 264px on desktop; a drawer on mobile.
 * items: [{ to, labelKey, icon: LucideIcon, end? }]
 */
export default function Sidebar({ items, open, onClose }) {
  const { t } = useTranslation();

  const nav = (
    <nav aria-label={t('nav.mainNav')} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {items.map(({ to, labelKey, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint',
              isActive ? 'bg-mint text-emerald-darker' : 'text-white hover:bg-emerald-dark',
            )
          }
        >
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex h-16 shrink-0 items-center justify-between px-5">
      <img src={logoWhite} alt={t('appName')} className="h-9 w-auto" />
      <button
        type="button"
        onClick={onClose}
        aria-label={t('nav.closeMenu')}
        className="rounded-lg p-1.5 text-white hover:bg-emerald-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint lg:hidden"
      >
        <X size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-66 flex-col bg-emerald lg:flex">
        {brand}
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" aria-hidden="true" onClick={onClose} />
          <aside className="relative flex h-full w-66 max-w-[85vw] flex-col bg-emerald">
            {brand}
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
