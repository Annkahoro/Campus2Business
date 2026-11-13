import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Asterisk,
  BadgeCheck,
  CalendarDays,
  ClipboardCheck,
  Clock,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Star,
} from 'lucide-react';
import { Alert, Button, Card, EmptyState, PageSpinner } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { formatFieldValue } from '../../components/shared/DynamicField.jsx';
import { loc } from '../../lib/localized.js';
import ProgrammeCard, { CatalogueLabels } from './ProgrammeCard.jsx';
import { C2B_CONTACT, coverFor } from './constants.js';
import { formatDate, formatDateRange, formatDuration, formatTimeRange, priceLabel, upcomingIntakes } from './format.js';
import { useProgramme, useProgrammes } from './hooks.js';

function Section({ title, eyebrow, children }) {
  return (
    <section className="space-y-4">
      {eyebrow && <span className="inline-block rounded-full bg-ink px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">{eyebrow}</span>}
      <h2 className="font-display text-xl font-semibold md:text-2xl">
        {title}
        <span className="text-emerald">.</span>
      </h2>
      {children}
    </section>
  );
}

function InfoItem({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-emerald" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</dt>
        <dd className="break-words text-sm text-ink">{children}</dd>
      </div>
    </div>
  );
}

function IntakeItem({ intake, lang, t }) {
  const time = formatTimeRange(intake);
  const note = loc(intake.note, lang);
  const place = intake.location && intake.location !== 'Online' ? intake.location : t('programme.modes.online');
  return (
    <li className="rounded-xl bg-cream px-3 py-2.5 text-sm">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <CalendarDays size={15} strokeWidth={1.75} className="text-emerald" aria-hidden="true" />
        {formatDateRange(intake, lang)}
      </p>
      {(time || note) && (
        <p className="mt-1 flex items-center gap-2 text-ink-muted">
          <Clock size={15} strokeWidth={1.75} aria-hidden="true" />
          {[time, note].filter(Boolean).join(' · ')}
        </p>
      )}
      <p className="mt-1 flex items-start gap-2 text-ink-muted">
        <MapPin size={15} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
        {place}
      </p>
      {intake.seats ? <p className="mt-1 text-ink-muted">{t('programme.seats', { count: intake.seats })}</p> : null}
    </li>
  );
}

/** "You'll definitely be interested in": same primary category, current programme excluded. */
function RelatedProgrammes({ programme, basePath }) {
  const { t } = useTranslation();
  const query = useProgrammes({ category: programme.categories?.[0], exclude: programme.id, limit: 3 }, { enabled: !!programme.categories?.length });
  const items = query.data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <Section title={t('programme.detail.related')}>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((p) => (
          <ProgrammeCard key={p.id} programme={p} to={`${basePath}/${p.id}`} />
        ))}
      </div>
    </Section>
  );
}

/** Sidebar "Other programmes": featured programmes (excluding this one). */
function OtherProgrammes({ programme, basePath }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const query = useProgrammes({ featured: 'true', exclude: programme.id, limit: 4 });
  const items = query.data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold">{t('programme.detail.otherProgrammes')}</h2>
      <ul className="space-y-3">
        {items.map((p) => (
          <li key={p.id} className="relative flex items-center gap-3 rounded-xl p-1.5 hover:bg-mint-soft">
            <img src={coverFor(p)} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0">
              <Link
                to={`${basePath}/${p.id}`}
                className="line-clamp-2 text-sm font-semibold text-ink after:absolute after:inset-0 hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald rounded"
              >
                {loc(p.title, lang)}
              </Link>
              <p className="text-xs font-semibold text-emerald">{priceLabel(p, lang, t)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Programme detail shared by the public, learner and admin areas, structured like the campus2b.com course page.
 * backTo: catalogue path; prereqBasePath: where programme links go; actions: header buttons (enroll / admin).
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
  const price = priceLabel(p, lang, t);
  const duration = formatDuration(p, t);
  const description = loc(p.description, lang);
  const prereqText = loc(p.prerequisiteText, lang);
  const topics = (p.topics?.[lang]?.length ? p.topics[lang] : p.topics?.[lang === 'en' ? 'es' : 'en']) ?? [];
  const idealFor = (p.idealFor?.[lang]?.length ? p.idealFor[lang] : p.idealFor?.[lang === 'en' ? 'es' : 'en']) ?? [];
  const scheduled = p.catalogue === 'general';
  const upcoming = upcomingIntakes(p);
  const past = (p.intakes ?? []).filter((i) => !upcoming.includes(i));
  const customRows = fields
    .map((f) => ({ field: f, value: formatFieldValue(f, p.customFields?.[f.key], { t, lang }) }))
    .filter((r) => r.value !== null);
  const modeLabel = scheduled ? t(`programme.modes.${p.deliveryMode ?? 'online'}`) : t('programme.detail.virtualPlatform');

  const steps = [
    { icon: ClipboardCheck, key: 'request' },
    { icon: BadgeCheck, key: p.subsidised || p.price?.amount === 0 ? 'approvalFree' : 'approval' },
    { icon: KeyRound, key: scheduled ? 'startScheduled' : 'startElearning' },
  ];

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

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-10">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="max-w-2xl font-display text-2xl font-bold md:text-4xl">{loc(p.title, lang)}</h1>
              {price && (
                <span className={p.subsidised ? 'rounded-full bg-mint px-4 py-1.5 font-semibold text-emerald-darker' : 'rounded-full border border-line bg-surface px-4 py-1.5 font-display text-xl font-bold text-ink'}>
                  {price}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <CatalogueLabels programme={p} />
              {p.featured && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald">
                  <Star size={12} strokeWidth={2} aria-hidden="true" />
                  {t('programme.featured')}
                </span>
              )}
              {p.code && <span className="text-xs font-medium text-ink-muted">{p.code}</span>}
            </div>
            {loc(p.shortDescription, lang) && <p className="text-lg text-ink-muted">{loc(p.shortDescription, lang)}</p>}
          </div>

          <img src={coverFor(p)} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />

          {/* Detailed information */}
          <Section title={t('programme.detail.detailedInfo')}>
            <dl className="grid gap-5 rounded-[var(--radius-card)] bg-cream-dark p-5 sm:grid-cols-2">
              <InfoItem icon={Mail} label={t('programme.detail.email')}>
                <a href={`mailto:${C2B_CONTACT.email}`} className="text-emerald hover:underline">
                  {C2B_CONTACT.email}
                </a>
              </InfoItem>
              <InfoItem icon={BadgeCheck} label={t('programme.detail.organizer')}>
                {p.organizer || 'C2B'}
              </InfoItem>
              <InfoItem icon={Phone} label={t('programme.detail.phone')}>
                <a href={`tel:${C2B_CONTACT.phone.replace(/\s/g, '')}`} className="text-emerald hover:underline">
                  {C2B_CONTACT.phone}
                </a>
              </InfoItem>
              <InfoItem icon={MapPin} label={t('programme.labels.mode')}>
                {modeLabel}
              </InfoItem>
              {scheduled && upcoming[0] && (
                <>
                  <InfoItem icon={CalendarDays} label={t('programme.detail.dates')}>
                    {formatDateRange(upcoming[0], lang)}
                  </InfoItem>
                  {(formatTimeRange(upcoming[0]) || loc(upcoming[0].note, lang)) && (
                    <InfoItem icon={Clock} label={t('programme.detail.schedule')}>
                      {[formatTimeRange(upcoming[0]), loc(upcoming[0].note, lang)].filter(Boolean).join(' · ')}
                    </InfoItem>
                  )}
                </>
              )}
            </dl>
          </Section>

          {description && (
            <Section title={t('programme.detail.about')}>
              <p className="whitespace-pre-line leading-relaxed text-ink">{description}</p>
            </Section>
          )}

          {topics.length > 0 && (
            <Section eyebrow={t('programme.detail.content')} title={t('programme.detail.topics')}>
              <ul className="list-disc space-y-2 pl-5 text-ink marker:text-emerald">
                {topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </Section>
          )}

          <Section title={t('programme.detail.howItWorks')}>
            <ol className="grid gap-6 sm:grid-cols-3">
              {steps.map(({ icon: Icon, key }, index) => (
                <li key={key} className="flex flex-col items-center text-center">
                  <div className="relative">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald bg-surface text-emerald">
                      <Icon size={26} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold text-ink">{t(`programme.detail.steps.${key}.title`)}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{t(`programme.detail.steps.${key}.text`)}</p>
                </li>
              ))}
            </ol>
          </Section>

          {idealFor.length > 0 && (
            <Section title={t('programme.detail.idealFor')}>
              <ul className="space-y-3">
                {idealFor.map((item) => (
                  <li key={item} className="flex gap-2 text-ink">
                    <Asterisk size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-emerald" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
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
                        className="rounded font-medium text-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
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

          <RelatedProgrammes programme={p} basePath={prereqBasePath} />

          <div className="flex flex-col items-start justify-between gap-4 rounded-[var(--radius-card)] bg-emerald-darker px-6 py-6 text-white sm:flex-row sm:items-center md:px-10">
            <p className="font-display text-xl font-semibold md:text-2xl">{t('programme.detail.questions')}</p>
            <Button
              as="a"
              href={`mailto:${C2B_CONTACT.email}?subject=${encodeURIComponent(loc(p.title, lang))}`}
              variant="secondary"
              rightIcon={<ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" />}
            >
              {t('programme.detail.contact')}
            </Button>
          </div>
        </div>

        <aside className="space-y-8">
          <Card className="space-y-5 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-semibold">{t('programme.detail.information')}</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t('programme.detail.format')}</dt>
                <dd className="text-right font-medium text-ink">{t(`programme.catalogues.${p.catalogue}`)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t('programme.labels.mode')}</dt>
                <dd className="text-right font-medium text-ink">{modeLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t('programme.detail.organizer')}</dt>
                <dd className="text-right font-medium text-ink">{p.organizer || 'C2B'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{t('programme.detail.level')}</dt>
                <dd className="text-right font-medium text-ink">{t(`programme.levels.${p.level}`)}</dd>
              </div>
              {duration && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t('programme.labels.duration')}</dt>
                  <dd className="text-right font-medium text-ink">{duration}</dd>
                </div>
              )}
              {p.language?.length > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t('programme.labels.languages')}</dt>
                  <dd className="text-right font-medium text-ink">{p.language.map((l) => t(`language.names.${l}`)).join(', ')}</dd>
                </div>
              )}
              {p.targetAudience?.length > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t('programme.labels.audience')}</dt>
                  <dd className="text-right font-medium text-ink">{p.targetAudience.map((a) => t(`programme.audience.${a}`)).join(', ')}</dd>
                </div>
              )}
              {p.targetDepartments?.length > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{t('programme.labels.departments')}</dt>
                  <dd className="text-right font-medium text-ink">{p.targetDepartments.join(', ')}</dd>
                </div>
              )}
            </dl>

            {scheduled && (
              <div className="border-t border-line pt-5">
                <h3 className="mb-3 text-sm font-semibold text-ink">{t('programme.labels.intakes')}</h3>
                {upcoming.length ? (
                  <ul className="space-y-3">
                    {upcoming.map((i) => (
                      <IntakeItem key={i.id} intake={i} lang={lang} t={t} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-muted">{t('programme.detail.noUpcoming')}</p>
                )}
                {past.length > 0 && (
                  <p className="mt-3 text-xs text-ink-muted">
                    {t('programme.detail.pastRuns', { dates: past.map((i) => formatDate(i.startDate, lang)).join(', ') })}
                  </p>
                )}
              </div>
            )}
          </Card>

          <OtherProgrammes programme={p} basePath={prereqBasePath} />
        </aside>
      </div>
    </div>
  );
}
