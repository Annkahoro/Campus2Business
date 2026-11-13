import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, MonitorSmartphone, Target } from 'lucide-react';
import { loc } from '../../lib/localized.js';
import { cn } from '../../lib/cn.js';
import { formatDuration, priceLabel } from '../programmes/format.js';
import { useCategoryLabel } from '../programmes/hooks.js';
import { PHASE_STYLES } from './constants.js';

export function PhaseBadge({ phase, className }) {
  const { t } = useTranslation('pathway');
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        PHASE_STYLES[phase]?.badge ?? 'bg-cream-dark text-ink',
        className,
      )}
    >
      {t(`phases.${phase}`, { defaultValue: phase })}
    </span>
  );
}

/** Match score as a flat, solid bar (docs/08). */
export function MatchScore({ value }) {
  const { t } = useTranslation('pathway');
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center gap-2" title={t('matchScore', { value })}>
      <span className="sr-only">{t('matchScore', { value })}</span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-cream-dark" aria-hidden="true">
        <div className="h-full rounded-full bg-emerald" style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold text-emerald" aria-hidden="true">
        {value}%
      </span>
    </div>
  );
}

/**
 * Vertical pathway timeline (docs/09 My Pathway).
 * steps: final.pathway DTOs. `programmeHref(id)` makes the title a link; `renderAction(step)` adds a CTA
 * (e.g. "Request enrollment" in Phase 7).
 */
export default function PathwayTimeline({ steps, programmeHref, renderAction }) {
  const { t, i18n } = useTranslation('pathway');
  const lang = i18n.resolvedLanguage;
  const categoryLabel = useCategoryLabel();

  return (
    <ol className="relative space-y-6">
      {steps.map((step, index) => {
        const p = step.programme ?? {};
        const title = p.missing ? t('programmeUnavailable') : loc(p.title, lang);
        const last = index === steps.length - 1;
        const meta = [
          p.categories?.length && p.categories.map(categoryLabel).join(', '),
          p.level && t(`programme.levels.${p.level}`, { ns: 'common', defaultValue: p.level }),
        ].filter(Boolean);
        const duration = formatDuration(p, t);
        const price = priceLabel(p, lang, t);

        return (
          <li key={`${p.id}-${index}`} className="relative flex gap-4">
            {!last && <span className="absolute left-5 top-12 -bottom-6 w-0.5 bg-line" aria-hidden="true" />}
            <span
              className={cn(
                'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-base font-bold',
                PHASE_STYLES[step.phase]?.dot ?? 'bg-emerald text-white',
              )}
              aria-hidden="true"
            >
              {step.order ?? index + 1}
            </span>

            <article className="flex-1 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="sr-only">{t('stepN', { n: step.order ?? index + 1 })}</span>
                    <PhaseBadge phase={step.phase} />
                    {p.code && <span className="text-xs font-medium text-ink-muted">{p.code}</span>}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    {programmeHref && !p.missing ? (
                      <Link to={programmeHref(p.id)} className="hover:text-emerald hover:underline">
                        {title}
                      </Link>
                    ) : (
                      title
                    )}
                  </h3>
                  {meta.length > 0 && <p className="text-sm text-ink-muted">{meta.join(' · ')}</p>}
                </div>
                <MatchScore value={step.matchScore} />
              </div>

              <p className="mt-3 text-ink">{loc(step.reason, lang)}</p>

              {loc(step.expectedOutcome, lang) && (
                <p className="mt-3 flex gap-2 rounded-xl bg-mint-soft p-3 text-sm text-emerald-darker">
                  <Target size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{t('expectedOutcome')}: </span>
                    {loc(step.expectedOutcome, lang)}
                  </span>
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
                  {duration && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
                      {duration}
                    </span>
                  )}
                  {p.deliveryMode && (
                    <span className="inline-flex items-center gap-1.5">
                      <MonitorSmartphone size={16} strokeWidth={1.75} aria-hidden="true" />
                      {t(`programme.modes.${p.deliveryMode}`, { ns: 'common', defaultValue: p.deliveryMode })}
                    </span>
                  )}
                  {price && <span className="font-medium text-ink">{price}</span>}
                </div>
                {renderAction?.(step)}
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
