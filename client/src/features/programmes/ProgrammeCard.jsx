import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, MapPin, Star } from 'lucide-react';
import { loc } from '../../lib/localized.js';
import { coverFor } from './constants.js';
import { formatDateRange, formatTimeRange, nextIntake, priceLabel } from './format.js';
import { useCategoryLabel } from './hooks.js';

/** "eLearning catalogue | Artificial intelligence" line used on cards and the detail header. */
export function CatalogueLabels({ programme, className = '' }) {
  const { t } = useTranslation();
  const categoryLabel = useCategoryLabel();
  const labels = [t(`programme.catalogues.${programme.catalogue}`), ...(programme.categories ?? []).map(categoryLabel)];
  return (
    <p className={`text-xs font-semibold uppercase tracking-wide text-ink-muted ${className}`}>
      {labels.map((label, i) => (
        <span key={label}>
          {i > 0 && (
            <span className="mx-1.5 text-line" aria-hidden="true">
              |
            </span>
          )}
          {label}
        </span>
      ))}
    </p>
  );
}

export default function ProgrammeCard({ programme, to }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const title = loc(programme.title, lang);
  const price = priceLabel(programme, lang, t);
  const scheduled = programme.catalogue === 'general';
  const intake = scheduled ? nextIntake(programme) : null;
  const time = formatTimeRange(intake);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface p-3 shadow-[var(--shadow-card)] transition-shadow hover:shadow-md">
      <div className="relative overflow-hidden rounded-xl">
        <img src={coverFor(programme)} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover" />
        {programme.featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald px-2.5 py-0.5 text-xs font-semibold text-white">
            <Star size={12} strokeWidth={2} aria-hidden="true" />
            {t('programme.featured')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <CatalogueLabels programme={programme} />

        <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">
          <Link
            to={to}
            className="rounded after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald group-hover:text-emerald"
          >
            {title}
          </Link>
        </h3>

        {scheduled && (
          <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
            {intake ? (
              <>
                <li className="flex items-center gap-2">
                  <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-emerald" />
                  {formatDateRange(intake, lang)}
                </li>
                {time && (
                  <li className="flex items-center gap-2">
                    <Clock size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-emerald" />
                    {time}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <MapPin size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-emerald" />
                  {t(`programme.modes.${programme.deliveryMode ?? 'online'}`)}
                </li>
              </>
            ) : (
              <li className="flex items-center gap-2">
                <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                {t('programme.noUpcomingDates')}
              </li>
            )}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className={programme.subsidised ? 'rounded-full bg-mint px-3 py-1 text-sm font-semibold text-emerald-darker' : 'font-display text-lg font-bold text-ink'}>
            {price ?? ''}
          </span>
          <span className="text-sm font-semibold text-emerald group-hover:underline" aria-hidden="true">
            {t('programme.viewDetails')}
          </span>
        </div>
      </div>
    </article>
  );
}
