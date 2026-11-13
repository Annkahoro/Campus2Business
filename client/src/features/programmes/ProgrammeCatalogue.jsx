import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CalendarDays, Clock, LayoutGrid, List, MapPin, Search, SearchX } from 'lucide-react';
import { Button, EmptyState, Input, Pagination, Select, Spinner, Tabs } from '../../components/ui/index.js';
import { cn } from '../../lib/cn.js';
import { loc } from '../../lib/localized.js';
import ProgrammeCard from './ProgrammeCard.jsx';
import { useCategoryLabel, useProgrammeCategories, useProgrammes } from './hooks.js';
import { CATALOGUES, LEVELS, MODES } from './constants.js';
import { formatDateRange, formatTimeRange, priceLabel, upcomingIntakes } from './format.js';

const FILTER_KEYS = ['search', 'category', 'level', 'mode', 'subsidised'];

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald',
        active ? 'border-emerald bg-emerald text-white' : 'border-line bg-surface text-ink hover:border-emerald hover:text-emerald',
      )}
    >
      {children}
    </button>
  );
}

/** Upcoming sessions of scheduled programmes, grouped by month (the "training calendar"). */
function CalendarList({ programmes, basePath }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const categoryLabel = useCategoryLabel();

  const months = useMemo(() => {
    const rows = programmes
      .flatMap((p) => upcomingIntakes(p).map((intake) => ({ p, intake })))
      .sort((a, b) => new Date(a.intake.startDate) - new Date(b.intake.startDate));
    const fmt = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' });
    const groups = new Map();
    for (const row of rows) {
      const key = fmt.format(new Date(row.intake.startDate));
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return [...groups.entries()];
  }, [programmes, lang]);

  if (months.length === 0) {
    return (
      <EmptyState
        illustration={<CalendarDays size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('programme.calendar.emptyTitle')}
        description={t('programme.calendar.emptyText')}
      />
    );
  }

  return (
    <div className="space-y-8">
      {months.map(([month, rows]) => (
        <section key={month} className="space-y-3">
          <h3 className="font-display text-lg font-semibold capitalize text-ink">{month}</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            {rows.map(({ p, intake }) => {
              const time = formatTimeRange(intake);
              const note = loc(intake.note, lang);
              return (
                <li key={`${p.id}-${intake.id}`} className="relative grid gap-2 px-5 py-4 hover:bg-mint-soft sm:grid-cols-[220px_1fr_auto] sm:items-center">
                  <div className="text-sm">
                    <p className="flex items-center gap-2 font-semibold text-ink">
                      <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" className="text-emerald" />
                      {formatDateRange(intake, lang)}
                    </p>
                    {(time || note) && (
                      <p className="mt-1 flex items-center gap-2 text-ink-muted">
                        <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
                        {[time, note].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`${basePath}/${p.id}`}
                      className="font-semibold text-ink after:absolute after:inset-0 hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald rounded"
                    >
                      {loc(p.title, lang)}
                    </Link>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span className="uppercase tracking-wide">{(p.categories ?? []).map(categoryLabel).join(' · ')}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} strokeWidth={1.75} aria-hidden="true" />
                        {intake.location && intake.location !== 'Online' ? intake.location : t('programme.modes.online')}
                      </span>
                    </p>
                  </div>
                  <span className={p.subsidised ? 'justify-self-start rounded-full bg-mint px-3 py-1 text-sm font-semibold text-emerald-darker sm:justify-self-end' : 'font-display font-bold text-ink sm:text-right'}>
                    {priceLabel(p, lang, t)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Catalogue of published programmes, structured like campus2b.com: catalogue tabs (all / eLearning / training
 * calendar), category chips, filters kept in the URL (?catalogue=…&category=…&page=…) and, for the scheduled
 * catalogue, a calendar view. basePath: where cards link to, e.g. '/programmes' or '/learner/programmes'.
 */
export default function ProgrammeCatalogue({ basePath }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const catalogue = CATALOGUES.includes(params.get('catalogue')) ? params.get('catalogue') : '';
  const view = catalogue === 'general' && params.get('view') === 'calendar' ? 'calendar' : 'grid';
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? '']));

  // Debounce the search box into the URL.
  const [search, setSearch] = useState(filters.search);
  useEffect(() => setSearch(filters.search), [filters.search]);
  useEffect(() => {
    if (search === filters.search) return undefined;
    const id = setTimeout(() => update({ search }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function update(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  }

  const listParams = { ...filters, catalogue, page: view === 'calendar' ? 1 : page, limit: view === 'calendar' ? 100 : 12 };
  const query = useProgrammes(listParams);
  const categories = useProgrammeCategories();
  const categoryLabel = useCategoryLabel();
  const hasFilters = FILTER_KEYS.some((k) => filters[k]);

  // Chips: only categories with published programmes in the selected catalogue (plus the active one).
  const chips = (categories.data ?? []).filter((c) => (catalogue ? c.counts?.[catalogue] : c.counts?.total) > 0 || c.slug === filters.category);

  const catalogueTabs = [
    { value: '', label: t('programme.catalogueTabs.all') },
    { value: 'elearning', label: t('programme.catalogueTabs.elearning') },
    { value: 'general', label: t('programme.catalogueTabs.general') },
  ];
  // Switching catalogue keeps the search but resets the category (it may not exist in the other catalogue).
  const switchCatalogue = (value) => update({ catalogue: value, category: '', view: '' });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={catalogueTabs} value={catalogue} onChange={switchCatalogue} label={t('programme.catalogueTabs.label')} />
        {catalogue === 'general' && (
          <Tabs
            size="sm"
            label={t('programme.calendar.viewLabel')}
            value={view}
            onChange={(v) => update({ view: v === 'calendar' ? 'calendar' : '' })}
            tabs={[
              { value: 'grid', label: <><LayoutGrid size={14} strokeWidth={1.75} aria-hidden="true" />{t('programme.calendar.grid')}</> },
              { value: 'calendar', label: <><List size={14} strokeWidth={1.75} aria-hidden="true" />{t('programme.calendar.list')}</> },
            ]}
          />
        )}
      </div>

      <p className="max-w-3xl text-ink-muted">{t(`programme.catalogueIntro.${catalogue || 'all'}`)}</p>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-ink">{t('programme.filters.category')}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('programme.filters.category')}>
          <Chip active={!filters.category} onClick={() => update({ category: '' })}>
            {t('programme.filters.all')}
          </Chip>
          {chips.map((c) => (
            <Chip key={c.slug} active={filters.category === c.slug} onClick={() => update({ category: filters.category === c.slug ? '' : c.slug })}>
              {categoryLabel(c.slug)}
            </Chip>
          ))}
          <span className="mx-1 hidden w-px self-stretch bg-line sm:block" aria-hidden="true" />
          <Chip active={filters.subsidised === 'true'} onClick={() => update({ subsidised: filters.subsidised === 'true' ? '' : 'true' })}>
            {t('programme.subsidised')}
          </Chip>
        </div>
      </div>

      <div className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-3">
        <div className="relative">
          <Input
            label={t('programme.filters.search')}
            placeholder={t('programme.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            inputClassName="pl-10"
          />
          <Search size={18} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3.5 text-ink-muted" />
        </div>
        <Select
          label={t('programme.filters.level')}
          placeholder={t('programme.filters.all')}
          value={filters.level}
          onChange={(e) => update({ level: e.target.value })}
          options={LEVELS.map((l) => ({ value: l, label: t(`programme.levels.${l}`) }))}
        />
        <Select
          label={t('programme.filters.mode')}
          placeholder={t('programme.filters.all')}
          value={filters.mode}
          onChange={(e) => update({ mode: e.target.value })}
          options={MODES.map((m) => ({ value: m, label: t(`programme.modes.${m}`) }))}
        />
      </div>

      <div className="flex min-h-9 items-center justify-between gap-4">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {query.data && t('programme.resultsCount', { count: query.data.total })}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, ''])))}>
            {t('programme.filters.clear')}
          </Button>
        )}
      </div>

      {query.isPending && (
        <div className="flex justify-center py-16 text-emerald">
          <Spinner size="xl" />
        </div>
      )}

      {query.isError && (
        <EmptyState
          illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
          title={t('programme.loadError')}
          action={<Button onClick={() => query.refetch()}>{t('actions.retry')}</Button>}
        />
      )}

      {query.data && query.data.items.length === 0 && (
        <EmptyState
          illustration={<SearchX size={32} strokeWidth={1.75} aria-hidden="true" />}
          title={t('programme.noResults.title')}
          description={t('programme.noResults.text')}
        />
      )}

      {query.data && query.data.items.length > 0 && view === 'calendar' && (
        <div className={query.isFetching ? 'opacity-70' : ''}>
          <CalendarList programmes={query.data.items} basePath={basePath} />
        </div>
      )}

      {query.data && query.data.items.length > 0 && view === 'grid' && (
        <>
          <div className={`grid gap-6 sm:grid-cols-2 xl:grid-cols-3 ${query.isFetching ? 'opacity-70' : ''}`}>
            {query.data.items.map((p) => (
              <ProgrammeCard key={p.id} programme={p} to={`${basePath}/${p.id}`} />
            ))}
          </div>
          <Pagination page={query.data.page} pages={query.data.pages} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
