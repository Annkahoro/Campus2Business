import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Bot, Building2, ChevronDown, MessageSquare, Target, User } from 'lucide-react';
import { Badge, Card } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { loc } from '../../lib/localized.js';
import { IMPORTANCE_VARIANT } from './constants.js';
import { PhaseBadge } from './PathwayTimeline.jsx';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
        <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Left column: who this pathway is for (docs/06 §9). */
export function LearnerSnapshot({ learner }) {
  const { t, i18n } = useTranslation('pathway');
  const lang = i18n.resolvedLanguage;
  const p = learner.profile;
  if (!p) return null;
  const goals = p.goals.careerGoals;
  const prefs = p.goals.learningPreferences;
  const edu = p.education.education[0];
  const emp = p.employment.employment ?? {};

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/admin/learners/${learner.user.id}`} className="font-display text-lg font-semibold hover:text-emerald hover:underline">
            {learner.user.name}
          </Link>
          <p className="text-sm text-ink-muted">{t(`learners.types.${p.learnerType}`)}</p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      {(learner.organization || emp.jobTitle || edu) && (
        <Section icon={learner.organization ? Building2 : User} title={t('snapshot.background')}>
          <ul className="space-y-1 text-sm">
            {learner.organization && (
              <li>
                {learner.organization.name}
                {emp.department && ` · ${emp.department}`}
              </li>
            )}
            {emp.jobTitle && (
              <li>
                {emp.jobTitle}
                {emp.totalYearsExperience != null && ` · ${t('snapshot.years', { count: emp.totalYearsExperience })}`}
              </li>
            )}
            {edu && <li>{[edu.qualification, edu.fieldOfStudy, edu.institution].filter(Boolean).join(' · ')}</li>}
          </ul>
        </Section>
      )}

      <Section icon={Target} title={t('snapshot.goals')}>
        <ul className="space-y-1 text-sm">
          {goals.shortTerm && <li><span className="font-medium">{t('snapshot.shortTerm')}:</span> {goals.shortTerm}</li>}
          {goals.longTerm && <li><span className="font-medium">{t('snapshot.longTerm')}:</span> {goals.longTerm}</li>}
          {goals.targetRoles?.length > 0 && <li><span className="font-medium">{t('snapshot.targetRoles')}:</span> {goals.targetRoles.join(', ')}</li>}
          <li className="text-ink-muted">
            {[
              prefs.mode && t(`snapshot.modes.${prefs.mode}`, { defaultValue: prefs.mode }),
              prefs.hoursPerWeek && t('snapshot.hours', { count: prefs.hoursPerWeek }),
              prefs.budgetRange && t(`snapshot.budgets.${prefs.budgetRange}`, { defaultValue: prefs.budgetRange }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </li>
        </ul>
      </Section>

      {p.skills.skills.length > 0 && (
        <Section icon={User} title={t('snapshot.skills')}>
          <ul className="flex flex-wrap gap-1.5">
            {p.skills.skills.map((s) => (
              <li key={s.id}>
                <Badge variant="neutral">
                  {s.name} · {s.level}/5
                </Badge>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {p.orgRemarks.length > 0 && (
        <Section icon={MessageSquare} title={t('snapshot.remarks')}>
          <ul className="space-y-2">
            {p.orgRemarks.map((r) => (
              <li key={r.id} className="rounded-lg bg-cream p-2.5 text-sm">
                <span className="font-medium">{t(`remarks.categories.${r.category}`, { ns: 'profile', defaultValue: r.category })}: </span>
                {r.text}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {learner.history.length > 0 && (
        <Section icon={Target} title={t('snapshot.history')}>
          <ul className="space-y-1 text-sm">
            {learner.history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{loc(h.programme?.title, lang)}</span>
                <StatusBadge status={h.status} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Card>
  );
}

/** Read-only "AI original" (aiDraft) with confidence and token usage. */
export function AiOriginalPanel({ recommendation }) {
  const { t, i18n } = useTranslation('pathway');
  const lang = i18n.resolvedLanguage;
  const draft = recommendation.aiDraft;
  const meta = recommendation.aiMeta;

  return (
    <details className="group rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald">
        <span className="flex items-center gap-2 font-display text-lg font-semibold">
          <Bot size={20} strokeWidth={1.75} className="text-emerald" aria-hidden="true" />
          {t('aiOriginal.title')}
        </span>
        <ChevronDown size={18} strokeWidth={1.75} className="transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-4 border-t border-line p-5">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-muted">{t('aiOriginal.confidence')}</dt>
            <dd className="font-semibold">{draft.confidence !== null ? `${draft.confidence}%` : '—'}</dd>
          </div>
          {meta && (
            <>
              <div>
                <dt className="text-ink-muted">{t('aiOriginal.tokens')}</dt>
                <dd className="font-semibold">
                  {meta.inputTokens ?? 0} / {meta.outputTokens ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t('aiOriginal.model')}</dt>
                <dd className="break-all font-semibold">{meta.model ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t('aiOriginal.latency')}</dt>
                <dd className="font-semibold">{meta.latencyMs ? `${(meta.latencyMs / 1000).toFixed(1)} s` : '—'}</dd>
              </div>
            </>
          )}
        </dl>

        <p className="text-sm text-ink">{loc(draft.summary, lang)}</p>

        <ol className="space-y-2">
          {draft.pathway.map((s, i) => (
            <li key={i} className="rounded-lg border border-line p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{s.order}.</span>
                <span className="font-medium">{loc(s.programme?.title, lang)}</span>
                <PhaseBadge phase={s.phase} />
                {s.matchScore !== null && <span className="text-xs text-emerald">{s.matchScore}%</span>}
              </div>
              <p className="mt-1 text-ink-muted">{loc(s.reason, lang)}</p>
            </li>
          ))}
        </ol>

        {draft.skillGaps.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-sm font-semibold text-ink-muted">{t('skillGaps')}</h4>
            <ul className="flex flex-wrap gap-1.5">
              {draft.skillGaps.map((g, i) => (
                <li key={i}>
                  <Badge variant={IMPORTANCE_VARIANT[g.importance]}>{loc(g.skill, lang)}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendation.warnings.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-warning">
              <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
              {t('aiOriginal.postProcessing')}
            </h4>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {recommendation.warnings.map((w, i) => (
                <li key={i}>{t(`warnings.${w.code}`, { detail: w.detail ?? '', defaultValue: w.code })}</li>
              ))}
            </ul>
          </div>
        )}

        {recommendation.contextSnapshot && (
          <p className="text-xs text-ink-muted">
            {t('aiOriginal.contextLine', {
              catalogue: recommendation.contextSnapshot.catalogueSize,
              remarks: recommendation.contextSnapshot.remarksCount,
              cv: recommendation.contextSnapshot.cvChars,
            })}
          </p>
        )}
      </div>
    </details>
  );
}
