import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGS } from '../../i18n/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { cn } from '../../lib/cn.js';

/** EN / ES pill toggle (docs/08 §5 Topbar). Logged-in users also get PATCH /auth/me { preferredLanguage }. */
export default function LanguageSwitcher({ className }) {
  const { t, i18n } = useTranslation();
  const { savePreferredLanguage } = useAuth();
  const current = i18n.resolvedLanguage;

  const change = (lng) => {
    if (lng === current) return;
    i18n.changeLanguage(lng);
    savePreferredLanguage(lng);
  };

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={cn('inline-flex rounded-full border border-line bg-surface p-0.5', className)}
    >
      {SUPPORTED_LANGS.map((lng) => {
        const active = lng === current;
        return (
          <button
            key={lng}
            type="button"
            lang={lng}
            onClick={() => change(lng)}
            aria-pressed={active}
            aria-label={t('language.switchTo', { lang: t(`language.names.${lng}`) })}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold uppercase transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald',
              active ? 'bg-emerald text-white' : 'text-ink-muted hover:bg-mint-soft hover:text-emerald',
            )}
          >
            {lng}
          </button>
        );
      })}
    </div>
  );
}
