import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Sparkles, Trash2, UserPlus, Users, X } from 'lucide-react';
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
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import { useBulkDeleteLearners, useCreateLearner, useGenerateBulk, useLearners } from '../../features/recommendations/hooks.js';
import UserFormModal from '../../components/shared/UserFormModal.jsx';
import { GENERATABLE_PROFILE_STATUSES } from '../../features/recommendations/constants.js';

const TYPES = ['all', 'student', 'employee'];
const PROFILE_STATUSES = ['draft', 'complete', 'submitted', 'under_review', 'pathway_published'];
const GENERATE_MAX = 50; // server limit for one bulk generation

const canGenerate = (l) => GENERATABLE_PROFILE_STATUSES.includes(l.status) && l.isActive;

function Checkbox({ checked, indeterminate = false, onChange, label, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={`h-4 w-4 cursor-pointer accent-emerald ${className}`}
      checked={checked}
      onChange={onChange}
      aria-label={label}
    />
  );
}

/** /admin/learners — filters, completion, status, bulk "Generate pathways" and bulk delete (docs/09). */
export default function Learners() {
  const { t } = useTranslation('pathway');
  const [params, setParams] = useSearchParams();
  const type = TYPES.includes(params.get('type')) ? params.get('type') : 'all';
  const status = PROFILE_STATUSES.includes(params.get('status')) ? params.get('status') : '';
  const search = params.get('search') ?? '';
  const page = Number(params.get('page')) || 1;
  const query = useLearners({ type: type === 'all' ? undefined : type, status, search, page });
  const generate = useGenerateBulk();
  const bulkDelete = useBulkDeleteLearners();
  const [creating, setCreating] = useState(false);
  const createLearner = useCreateLearner();

  // Selection: learners on this page, or every learner matching the filters (allMatching) across pages.
  const [selected, setSelected] = useState(() => new Map()); // id → learner
  const [allMatching, setAllMatching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const clearSelection = () => {
    setSelected(new Map());
    setAllMatching(false);
  };
  // A different filter or page shows other learners → start a fresh selection.
  useEffect(clearSelection, [type, status, search, page]);

  const onCreate = async (values) => {
    await createLearner.mutateAsync(values);
    toast.success(t('learners.created', { name: values.name }));
    setCreating(false);
  };

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v && v !== 'all' ? next.set(k, String(v)) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const allOnPage = items.length > 0 && items.every((l) => selected.has(l.id));
  const someOnPage = items.some((l) => selected.has(l.id));
  const selectedCount = allMatching ? total : selected.size;
  const isSelected = (l) => allMatching || selected.has(l.id);

  // "Generate pathways" only applies to submitted (active) learners among the selection.
  const generatable = allMatching ? [] : [...selected.values()].filter(canGenerate);

  const toggle = (l) => {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(l.id)) next.delete(l.id);
      else next.set(l.id, l);
      return next;
    });
  };
  const togglePage = () => {
    setAllMatching(false);
    setSelected(allOnPage ? new Map() : new Map(items.map((l) => [l.id, l])));
  };

  const runGenerate = () =>
    generate.mutate(
      generatable.slice(0, GENERATE_MAX).map((l) => l.id),
      {
        onSuccess: (data) => {
          const failed = data.results.filter((r) => !r.ok).length;
          toast.success(t('admin.bulkStarted', { count: data.queued }));
          if (failed) toast.error(t('admin.bulkSkipped', { count: failed }));
          clearSelection();
        },
        onError: toast.apiError,
      },
    );

  const runDelete = () =>
    bulkDelete.mutate(
      allMatching
        ? { filter: { type: type === 'all' ? undefined : type, status: status || undefined, search: search || undefined } }
        : { userIds: [...selected.keys()] },
      {
        onSuccess: (res) => {
          if (res.deleted.length) toast.success(t('learners.bulk.deleted', { count: res.deleted.length }));
          if (res.failed.length) {
            toast.error(t('learners.bulk.failed', { count: res.failed.length, names: res.failed.map((f) => f.name).join(', ') }));
          }
          clearSelection();
          setConfirmDelete(false);
          // Everything on this page may be gone.
          if (page > 1 && res.deleted.length >= items.length) update({ page: page - 1 });
        },
        onError: (err) => {
          toast.apiError(err);
          setConfirmDelete(false);
        },
      },
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('learners.title')}</h1>
          <p className="mt-1 text-ink-muted">{t('learners.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => setCreating(true)} leftIcon={<UserPlus size={18} strokeWidth={1.75} aria-hidden="true" />}>
          {t('learners.add')}
        </Button>
      </div>

      <UserFormModal
        open={creating}
        onClose={() => setCreating(false)}
        mode="create"
        onSubmit={onCreate}
        loading={createLearner.isPending}
        title={t('learners.newTitle')}
        description={t('learners.newText')}
        submitLabel={t('learners.create')}
      />

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
          {/* Bulk action bar */}
          {selectedCount > 0 && (
            <div
              className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-emerald bg-mint-soft px-4 py-3 shadow-[var(--shadow-card)]"
              role="region"
              aria-label={t('learners.bulk.region')}
            >
              <p className="text-sm font-semibold text-emerald-darker">{t('learners.bulk.selected', { count: selectedCount })}</p>
              {!allMatching && allOnPage && total > items.length && (
                <button type="button" className="text-sm font-semibold text-emerald underline" onClick={() => setAllMatching(true)}>
                  {t('learners.bulk.selectAllMatching', { count: total })}
                </button>
              )}
              <div className="ml-auto flex flex-wrap gap-2">
                {!allMatching && (
                  <Button
                    size="sm"
                    onClick={runGenerate}
                    loading={generate.isPending}
                    disabled={generatable.length === 0 || bulkDelete.isPending}
                    title={generatable.length === 0 ? t('learners.bulk.noneGeneratable') : undefined}
                    leftIcon={<Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />}
                  >
                    {t('admin.bulkGenerate', { count: Math.min(generatable.length, GENERATE_MAX) })}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setConfirmDelete(true)}
                  disabled={bulkDelete.isPending || generate.isPending}
                  leftIcon={<Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />}
                >
                  {t('learners.bulk.delete')}
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection} leftIcon={<X size={16} strokeWidth={1.75} aria-hidden="true" />}>
                  {t('learners.bulk.clear')}
                </Button>
              </div>
            </div>
          )}

          <Card padded={false} className="overflow-hidden">
            <table className="hidden w-full text-left md:table">
              <thead className="bg-cream-dark text-xs uppercase text-ink-muted">
                <tr>
                  <th scope="col" className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allOnPage || allMatching}
                      indeterminate={!allOnPage && someOnPage}
                      onChange={togglePage}
                      label={t('learners.bulk.selectPage')}
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
                {items.map((l) => (
                  <tr key={l.id} className={isSelected(l) ? 'bg-mint-soft' : 'hover:bg-mint-soft'}>
                    <td className="px-4 py-3">
                      <Checkbox checked={isSelected(l)} onChange={() => toggle(l)} label={t('learners.select', { name: l.name })} />
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
                ))}
              </tbody>
            </table>

            {/* Mobile: stacked cards (docs/08 §6) */}
            <div className="flex items-center gap-3 border-b border-line bg-cream-dark px-4 py-2.5 md:hidden">
              <Checkbox
                checked={allOnPage || allMatching}
                indeterminate={!allOnPage && someOnPage}
                onChange={togglePage}
                label={t('learners.bulk.selectPage')}
              />
              <span className="text-xs font-semibold uppercase text-ink-muted">{t('learners.bulk.selectPage')}</span>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {items.map((l) => (
                <li key={l.id} className={`flex gap-3 p-4 ${isSelected(l) ? 'bg-mint-soft' : ''}`}>
                  <Checkbox checked={isSelected(l)} onChange={() => toggle(l)} label={t('learners.select', { name: l.name })} className="mt-1" />
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
              ))}
            </ul>
          </Card>
          <Pagination page={query.data.page} pages={query.data.pages} onChange={(p) => update({ page: p })} />
        </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => !bulkDelete.isPending && setConfirmDelete(false)}
        onConfirm={runDelete}
        loading={bulkDelete.isPending}
        title={t('learners.bulk.confirmTitle', { count: selectedCount })}
        description={t('learners.bulk.confirmText', { count: selectedCount })}
        confirmLabel={t('learners.bulk.delete')}
      />
    </div>
  );
}
