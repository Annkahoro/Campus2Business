import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Sparkles, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Pagination,
  ProgressBar,
  Select,
  Spinner,
  Tabs,
  toast,
} from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { useGenerateBulk, useLearners } from '../../features/recommendations/hooks.js';
import { GENERATABLE_PROFILE_STATUSES } from '../../features/recommendations/constants.js';

const TYPES = ['all', 'student', 'employee'];
const PROFILE_STATUSES = ['draft', 'complete', 'submitted', 'under_review', 'pathway_published'];

/** /admin/learners — filters, completion, status, bulk "Generate pathways" (docs/09). */
export default function Learners() {
  const { t } = useTranslation('pathway');
  const [params, setParams] = useSearchParams();
  const type = TYPES.includes(params.get('type')) ? params.get('type') : 'all';
  const status = PROFILE_STATUSES.includes(params.get('status')) ? params.get('status') : '';
  const search = params.get('search') ?? '';
  const page = Number(params.get('page')) || 1;
  const query = useLearners({ type: type === 'all' ? undefined : type, status, search, page });
  const bulk = useGenerateBulk();
  const [selected, setSelected] = useState(new Set());

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v && v !== 'all' ? next.set(k, String(v)) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
    setSelected(new Set());
  };

  const items = query.data?.items ?? [];
  const selectable = items.filter((l) => GENERATABLE_PROFILE_STATUSES.includes(l.status) && l.isActive);
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = selectable.length > 0 && selectable.every((l) => selected.has(l.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((l) => l.id)));

  const runBulk = () =>
    bulk.mutate([...selected], {
      onSuccess: (data) => {
        const failed = data.results.filter((r) => !r.ok).length;
        toast.success(t('admin.bulkStarted', { count: data.queued }));
        if (failed) toast.error(t('admin.bulkSkipped', { count: failed }));
        setSelected(new Set());
      },
      onError: toast.apiError,
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('learners.title')}</h1>
          <p className="mt-1 text-ink-muted">{t('learners.subtitle')}</p>
        </div>
        <Button
          onClick={runBulk}
          disabled={selected.size === 0}
          loading={bulk.isPending}
          leftIcon={<Sparkles size={18} strokeWidth={1.75} aria-hidden="true" />}
        >
          {t('admin.bulkGenerate', { count: selected.size })}
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Tabs
          label={t('learners.typeLabel')}
          value={type}
          onChange={(v) => update({ type: v })}
          tabs={TYPES.map((v) => ({ value: v, label: t(`learners.types.${v}`) }))}
        />
        <Select
          className="w-full sm:w-56"
          label={t('learners.statusFilter')}
          value={status}
          onChange={(e) => update({ status: e.target.value })}
          options={[
            { value: '', label: t('learners.allStatuses') },
            ...PROFILE_STATUSES.map((s) => ({
              value: s,
              label: `${t(`status.${s}`)}${query.data?.counts?.[s] ? ` (${query.data.counts[s]})` : ''}`,
            })),
          ]}
        />
        <Input
          className="w-full sm:w-72"
          label={t('learners.search')}
          placeholder={t('learners.searchPlaceholder')}
          defaultValue={search}
          onKeyDown={(e) => e.key === 'Enter' && update({ search: e.currentTarget.value.trim() })}
        />
      </div>

      {query.isPending && (
        <div className="flex justify-center py-16 text-emerald">
          <Spinner size="xl" />
        </div>
      )}
      {query.isError && (
        <EmptyState
          illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
          title={t('learners.loadError')}
          action={<Button onClick={() => query.refetch()}>{t('actions.retry')}</Button>}
        />
      )}
      {query.data && items.length === 0 && (
        <Card>
          <EmptyState
            illustration={<Users size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('learners.emptyTitle')}
            description={t('learners.emptyText')}
          />
        </Card>
      )}

      {items.length > 0 && (
        <>
          <Card padded={false} className="overflow-hidden">
            <table className="hidden w-full text-left md:table">
              <thead className="bg-cream-dark text-xs uppercase text-ink-muted">
                <tr>
                  <th scope="col" className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={selectable.length === 0}
                      aria-label={t('learners.selectAll')}
                      className="h-4 w-4 accent-emerald"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('learners.columns.learner')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('learners.columns.type')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('learners.columns.completion')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('learners.columns.profile')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('learners.columns.pathway')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((l) => {
                  const canPick = GENERATABLE_PROFILE_STATUSES.includes(l.status) && l.isActive;
                  return (
                    <tr key={l.id} className="hover:bg-mint-soft">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(l.id)}
                          onChange={() => toggle(l.id)}
                          disabled={!canPick}
                          aria-label={t('learners.select', { name: l.name })}
                          className="h-4 w-4 accent-emerald"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link to={`/admin/learners/${l.id}`} className="font-medium text-ink hover:text-emerald hover:underline">
                          {l.name}
                        </Link>
                        <p className="text-xs text-ink-muted">{l.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={l.type === 'employee' ? 'info' : 'soft'}>{t(`learners.types.${l.type}`)}</Badge>
                        {l.organization && (
                          <p className="mt-1 text-xs text-ink-muted">
                            {l.organization.name}
                            {l.department && ` · ${l.department}`}
                          </p>
                        )}
                      </td>
                      <td className="w-40 px-4 py-3">
                        <ProgressBar value={l.completionPercent} size="sm" showValue ariaLabel={t('learners.columns.completion')} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={l.isActive ? l.status : 'suspended'} />
                      </td>
                      <td className="px-4 py-3">
                        {l.latestRecommendation ? (
                          <Link to={`/admin/recommendations/${l.latestRecommendation.id}`} className="inline-flex items-center gap-2">
                            <StatusBadge status={l.latestRecommendation.status} />
                            <span className="text-xs text-ink-muted">v{l.latestRecommendation.version}</span>
                          </Link>
                        ) : (
                          <span className="text-sm text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Mobile: stacked cards (docs/08 §6) */}
            <ul className="divide-y divide-line md:hidden">
              {items.map((l) => {
                const canPick = GENERATABLE_PROFILE_STATUSES.includes(l.status) && l.isActive;
                return (
                  <li key={l.id} className="flex gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={selected.has(l.id)}
                      onChange={() => toggle(l.id)}
                      disabled={!canPick}
                      aria-label={t('learners.select', { name: l.name })}
                      className="mt-1 h-4 w-4 accent-emerald"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link to={`/admin/learners/${l.id}`} className="font-medium text-ink hover:text-emerald">
                            {l.name}
                          </Link>
                          <p className="truncate text-xs text-ink-muted">
                            {t(`learners.types.${l.type}`)}
                            {l.organization && ` · ${l.organization.name}`}
                          </p>
                        </div>
                        <StatusBadge status={l.isActive ? l.status : 'suspended'} />
                      </div>
                      <ProgressBar value={l.completionPercent} size="sm" label={t('learners.columns.completion')} />
                      {l.latestRecommendation && (
                        <Link to={`/admin/recommendations/${l.latestRecommendation.id}`} className="inline-flex items-center gap-2 text-xs text-ink-muted">
                          {t('learners.columns.pathway')}: <StatusBadge status={l.latestRecommendation.status} /> v{l.latestRecommendation.version}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Pagination page={query.data.page} pages={query.data.pages} onChange={(p) => update({ page: p })} />
        </>
      )}
    </div>
  );
}
