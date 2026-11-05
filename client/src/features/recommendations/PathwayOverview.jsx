import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquareQuote, Sparkles, TrendingUp } from 'lucide-react';
import { Badge, Card } from '../../components/ui/index.js';
import { loc } from '../../lib/localized.js';
import { IMPORTANCE_VARIANT } from './constants.js';
import PathwayTimeline from './PathwayTimeline.jsx';

/**
 * A published pathway as the learner / org admin sees it (docs/09 My Pathway):
 * summary, strengths, skill gaps, admin note, timeline and alternatives.
 */
export default function PathwayOverview({ pathway, programmeHref, renderAction, compact = false }) {
  const { t, i18n } = useTranslation('pathway');
  const lang = i18n.resolvedLanguage;
  const note = loc(pathway.adminNoteToLearner, lang);

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint text-emerald-darker">
            <Sparkles size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold">{t('summaryTitle')}</h2>
            <p className="mt-1 text-ink">{loc(pathway.summary, lang)}</p>
          </div>
        </div>

        {!compact && pathway.strengths.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-muted">{t('strengths')}</h3>
            <ul className="flex flex-wrap gap-2">
              {pathway.strengths.map((s, i) => (
                <li key={i}>
                  <Badge variant="success">{loc(s, lang)}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {pathway.skillGaps.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-muted">{t('skillGaps')}</h3>
            <ul className="flex flex-wrap gap-2">
              {pathway.skillGaps.map((g, i) => (
                <li key={i}>
                  <Badge variant={IMPORTANCE_VARIANT[g.importance] ?? 'neutral'} icon={<TrendingUp size={12} strokeWidth={2} aria-hidden="true" />}>
                    {loc(g.skill, lang)}
                    <span className="sr-only"> ({t(`importance.${g.importance}`)})</span>
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {note && (
          <blockquote className="flex gap-3 rounded-xl border border-line bg-cream p-4">
            <MessageSquareQuote size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-emerald" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-emerald">{t('noteFromC2B')}</p>
              <p className="mt-1 text-ink">{note}</p>
            </div>
          </blockquote>
        )}
      </Card>

      <section aria-labelledby="pathway-steps" className="space-y-4">
        <h2 id="pathway-steps" className="font-display text-xl font-semibold">
          {t('stepsTitle', { count: pathway.pathway.length })}
        </h2>
        <PathwayTimeline steps={pathway.pathway} programmeHref={programmeHref} renderAction={renderAction} />
      </section>

      {pathway.alternatives.length > 0 && (
        <section aria-labelledby="pathway-alts" className="space-y-3">
          <h2 id="pathway-alts" className="font-display text-xl font-semibold">
            {t('alternatives')}
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {pathway.alternatives.map((a, i) => (
              <li key={i} className="rounded-xl border border-line bg-surface p-4">
                <p className="font-semibold text-ink">
                  {programmeHref && !a.programme?.missing ? (
                    <Link to={programmeHref(a.programme.id)} className="hover:text-emerald hover:underline">
                      {loc(a.programme?.title, lang)}
                    </Link>
                  ) : (
                    loc(a.programme?.title, lang) || t('programmeUnavailable')
                  )}
                </p>
                <p className="mt-1 text-sm text-ink-muted">{loc(a.reason, lang)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
