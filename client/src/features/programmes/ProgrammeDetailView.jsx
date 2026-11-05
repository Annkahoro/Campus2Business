import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, CalendarDays, Clock, Globe, Languages, MonitorSmartphone, Users } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, PageSpinner } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { formatFieldValue } from '../../components/shared/DynamicField.jsx';
import { loc } from '../../lib/localized.js';
import { coverFor } from './constants.js';
import { categoryLabel, formatDate, formatDuration, formatPrice } from './format.js';
import { useProgramme } from './hooks.js';

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Programme detail shared by the public, learner and admin areas.
 * backTo: catalogue path; prereqBasePath: where prerequisite links go; actions: extra header buttons (admin).
 */
export default function ProgrammeDetailView({ id, backTo, prereqBasePath, actions }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const query = useProgramme(id);

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    const notFound = query.error?.response?.status === 404;
    return (
      <EmptyState
        illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={notFound ? t('programme.notFound') : t('programme.loadError')}
        action={
          <Button as={Link} to={backTo}>
            {t('programme.backToCatalogue')}
          </Button>
        }
      />
    );
  }

  const { programme: p, fields } = query.data;
  const price = formatPrice(p.price, lang, t);
  const duration = formatDuration(p, t);
  const description = loc(p.description, lang);
  const prereqText = loc(p.prerequisiteText, lang);
  const customRows = fields
    .map((f) => ({ field: f, value: formatFieldValue(f, p.customFields?.[f.key], { t, lang }) }))
    .filter((r) => r.value !== null);

  const facts = [
    duration && { icon: Clock, label: t('programme.labels.duration'), value: duration },
    p.deliveryMode && { icon: MonitorSmartphone, label: t('programme.labels.mode'), value: t(`programme.modes.${p.deliveryMode}`) },
    p.language?.length > 0 && {
      icon: Languages,
      label: t('programme.labels.languages'),
      value: p.language.map((l) => t(`language.names.${l}`)).join(', '),
    },
    p.targetAudience?.length > 0 && {
      icon: Users,
      label: t('programme.labels.audience'),
      value: p.targetAudience.map((a) => t(`programme.audience.${a}`)).join(', '),
    },
    {
      icon: Globe,
      label: t('programme.labels.departments'),
      value: p.targetDepartments?.length ? p.targetDepartments.join(', ') : t('programme.allDepartments'),
    },
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button as={Link} to={backTo} variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}>
          {t('programme.backToCatalogue')}
        </Button>
        {actions}
      </div>

      {p.status !== 'published' && (
        <Alert variant="warning" title={t('programme.previewTitle')}>
          {t('programme.previewText')} <StatusBadge status={p.status} />
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="soft">{categoryLabel(t, p.category)}</Badge>
              <Badge variant="active">{t(`programme.levels.${p.level}`)}</Badge>
              {p.code && <span className="text-sm font-medium text-ink-muted">{p.code}</span>}
            </div>
            <h1 className="font-display text-2xl font-bold md:text-4xl">{loc(p.title, lang)}</h1>
            <p className="text-lg text-ink-muted">{loc(p.shortDescription, lang)}</p>
          </div>

          <div className="relative">
            <div className="absolute -bottom-3 -right-3 h-full w-full rounded-2xl bg-mint" aria-hidden="true" />
            <img src={coverFor(p)} alt="" className="relative aspect-[16/9] w-full rounded-2xl object-cover" />
          </div>

          {description && (
            <Section title={t('programme.labels.overview')}>
              <p className="whitespace-pre-line leading-relaxed text-ink">{description}</p>
            </Section>
          )}

          {p.skillsGained?.length > 0 && (
            <Section title={t('programme.labels.skillsGained')}>
              <ul className="flex flex-wrap gap-2">
                {p.skillsGained.map((s) => (
                  <li key={s} className="rounded-full bg-mint-soft px-3 py-1 text-sm text-emerald-darker">
                    {s}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(p.prerequisites?.length > 0 || prereqText) && (
            <Section title={t('programme.labels.prerequisites')}>
              {p.prerequisites?.length > 0 && (
                <ul className="space-y-2">
                  {p.prerequisites.map((pre) => (
                    <li key={pre.id}>
                      <Link
                        to={`${prereqBasePath}/${pre.id}`}
                        className="font-medium text-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald rounded"
                      >
                        {loc(pre.title, lang)}
                      </Link>
                      {pre.code && <span className="ml-2 text-sm text-ink-muted">{pre.code}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {prereqText && <p className="text-ink-muted">{prereqText}</p>}
            </Section>
          )}

          {customRows.length > 0 && (
            <Section title={t('programme.labels.additionalInfo')}>
              <dl className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
                {customRows.map(({ field, value }) => (
                  <div key={field.key} className="grid gap-1 px-5 py-3 sm:grid-cols-[220px_1fr]">
                    <dt className="text-sm font-medium text-ink-muted">{loc(field.label, lang) || field.key}</dt>
                    <dd className="text-ink">
                      {field.type === 'url' ? (
                        <a href={value} target="_blank" rel="noreferrer" className="break-all text-emerald hover:underline">
                          {value}
                        </a>
                      ) : (
                        value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {p.tags?.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t('programme.labels.tags')}>
              {p.tags.map((tag) => (
                <li key={tag} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-muted">
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-6">
          <Card className="space-y-5 lg:sticky lg:top-24">
            {price && (
              <div>
                <p className="text-sm text-ink-muted">{t('programme.labels.price')}</p>
                <p className="font-display text-3xl font-bold text-emerald">{price}</p>
              </div>
            )}
            <dl className="space-y-3">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-3">
                  <Icon size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-emerald" aria-hidden="true" />
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
                    <dd className="text-sm text-ink">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>

            <div className="border-t border-line pt-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <CalendarDays size={18} strokeWidth={1.75} className="text-emerald" aria-hidden="true" />
                {t('programme.labels.intakes')}
              </h2>
              {p.intakes?.length ? (
                <ul className="space-y-3">
                  {p.intakes.map((i) => (
                    <li key={i.id} className="rounded-xl bg-cream px-3 py-2 text-sm">
                      <p className="font-medium text-ink">
                        {formatDate(i.startDate, lang)}
                        {i.endDate && ` – ${formatDate(i.endDate, lang)}`}
                      </p>
                      <p className="text-ink-muted">
                        {[i.location, i.seats ? t('programme.seats', { count: i.seats }) : null].filter(Boolean).join(' · ')}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-muted">{t('programme.noIntakes')}</p>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
