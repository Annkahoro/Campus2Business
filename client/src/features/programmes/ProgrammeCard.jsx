import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, MonitorSmartphone } from 'lucide-react';
import { Badge } from '../../components/ui/index.js';
import { loc } from '../../lib/localized.js';
import { coverFor } from './constants.js';
import { categoryLabel, formatDate, formatDuration, formatPrice, nextIntake } from './format.js';

export default function ProgrammeCard({ programme, to }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const title = loc(programme.title, lang);
  const duration = formatDuration(programme, t);
  const price = formatPrice(programme.price, lang, t);
  const intake = nextIntake(programme);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] transition-shadow hover:shadow-md">
      <div className="relative">
        <img src={coverFor(programme)} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-emerald-darker">
          {categoryLabel(t, programme.category)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="soft">{t(`programme.levels.${programme.level}`)}</Badge>
          {programme.code && <span className="text-xs font-medium text-ink-muted">{programme.code}</span>}
        </div>

        <h3 className="font-display text-lg font-semibold leading-snug text-ink">
          <Link
            to={to}
            className="rounded after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald group-hover:text-emerald"
          >
            {title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{loc(programme.shortDescription, lang)}</p>

        <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
          {duration && (
            <li className="flex items-center gap-2">
              <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
              {duration}
            </li>
          )}
          {programme.deliveryMode && (
            <li className="flex items-center gap-2">
              <MonitorSmartphone size={16} strokeWidth={1.75} aria-hidden="true" />
              {t(`programme.modes.${programme.deliveryMode}`)}
            </li>
          )}
          {intake && (
            <li className="flex items-center gap-2">
              <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
              {t('programme.nextIntake', { date: formatDate(intake.startDate, lang) })}
            </li>
          )}
        </ul>

        <div className="mt-auto flex items-center justify-between pt-5">
          <span className="font-display text-lg font-bold text-emerald">{price ?? ''}</span>
          <span className="text-sm font-semibold text-emerald group-hover:underline" aria-hidden="true">
            {t('programme.viewDetails')}
          </span>
        </div>
      </div>
    </article>
  );
}
