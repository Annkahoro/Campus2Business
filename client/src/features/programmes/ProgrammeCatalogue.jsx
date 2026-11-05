import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Search, SearchX } from 'lucide-react';
import { Button, EmptyState, Input, Pagination, Select, Spinner } from '../../components/ui/index.js';
import ProgrammeCard from './ProgrammeCard.jsx';
import { useProgrammeCategories, useProgrammes } from './hooks.js';
import { LEVELS, MODES } from './constants.js';
import { categoryLabel } from './format.js';

const FILTER_KEYS = ['search', 'category', 'level', 'mode', 'lang'];

/**
 * Catalogue of published programmes with filters kept in the URL (?category=…&page=…).
 * basePath: where cards link to, e.g. '/programmes' or '/learner/programmes'.
 */
export default function ProgrammeCatalogue({ basePath }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
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

  const query = useProgrammes({ ...filters, page, limit: 12 });
  const categories = useProgrammeCategories();
  const hasFilters = FILTER_KEYS.some((k) => filters[k]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Input
            label={t('programme.filters.search')}
            placeholder={t('programme.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            inputClassName="pl-10"
          />
          <Search
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 left-3.5 text-ink-muted"
          />
        </div>
        <Select
          label={t('programme.filters.category')}
          placeholder={t('programme.filters.all')}
          value={filters.category}
          onChange={(e) => update({ category: e.target.value })}
          options={(categories.data ?? []).map((c) => ({ value: c, label: categoryLabel(t, c) }))}
        />
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
        <Select
          label={t('programme.filters.language')}
          placeholder={t('programme.filters.all')}
          value={filters.lang}
          onChange={(e) => update({ lang: e.target.value })}
          options={['en', 'es'].map((l) => ({ value: l, label: t(`language.names.${l}`) }))}
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

      {query.data && query.data.items.length > 0 && (
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
