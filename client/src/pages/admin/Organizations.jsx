import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Building2, CheckCircle2, PauseCircle, Plus, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Pagination, Spinner, Tabs, toast } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import { ORG_STATUSES } from '../../features/organizations/constants.js';
import { useAdminOrgs, useBulkOrgAction } from '../../features/organizations/hooks.js';

/** Bulk actions offered on each tab (same transitions as the single-organization buttons). */
const TAB_ACTIONS = {
  pending: ['approve', 'delete'],
  approved: ['suspend', 'delete'],
  suspended: ['approve', 'delete'],
  rejected: ['delete'],
};
const ACTION_ICONS = { approve: CheckCircle2, suspend: PauseCircle, delete: Trash2 };

function Checkbox({ checked, indeterminate = false, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 cursor-pointer accent-emerald"
      checked={checked}
      onChange={onChange}
      aria-label={label}
    />
  );
}

/** /admin/organizations — tabs Pending / Approved / Rejected / Suspended (docs/09), with bulk actions. */
export default function Organizations() {
  const { t, i18n } = useTranslation('admin');
  const [params, setParams] = useSearchParams();
  const status = ORG_STATUSES.includes(params.get('status')) ? params.get('status') : 'pending';
  const search = params.get('search') ?? '';
  const page = Number(params.get('page')) || 1;
  const query = useAdminOrgs({ status, search, page });
  const bulk = useBulkOrgAction();
  const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' });

  // Selection: ids on this page, or "every organization in this tab" (allMatching) across pages.
  const [selected, setSelected] = useState(() => new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [confirming, setConfirming] = useState(null); // action awaiting confirmation

  const clearSelection = () => {
    setSelected(new Set());
    setAllMatching(false);
  };
  // A different tab, search or page shows other organizations → start a fresh selection.
  useEffect(clearSelection, [status, search, page]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  const counts = query.data?.counts ?? {};
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pageIds = items.map((o) => o.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPage = pageIds.some((id) => selected.has(id));
  const selectedCount = allMatching ? total : selected.size;

  const toggle = (id) => {
    setAllMatching(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const togglePage = () => {
    setAllMatching(false);
    setSelected(allOnPage ? new Set() : new Set(pageIds));
  };

  const run = (action) =>
    bulk.mutate(allMatching ? { action, filter: { status, search: search || undefined } } : { action, ids: [...selected] }, {
      onSuccess: (res) => {
        if (res.done.length) {
          toast.success(
            t(`orgs.bulk.done.${action}`, { count: res.done.length }) +
              (action === 'delete' && res.convertedEmployees ? ` ${t('orgs.bulk.converted', { count: res.convertedEmployees })}` : ''),
          );
        }
        if (res.failed.length) {
          toast.error(t('orgs.bulk.failed', { count: res.failed.length, names: res.failed.map((f) => f.name).join(', ') }));
        }
        clearSelection();
        setConfirming(null);
        // Everything on this page may have left the tab.
        if (page > 1 && res.done.length >= items.length) update({ page: page - 1 });
      },
      onError: (err) => {
        toast.apiError(err);
        setConfirming(null);
      },
    });

  const actions = TAB_ACTIONS[status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('orgs.title')}</h1>
          <p className="mt-1 text-ink-muted">{t('orgs.subtitle')}</p>
        </div>
        <Button as={Link} to="/admin/organizations/new" leftIcon={<Plus size={18} strokeWidth={1.75} aria-hidden="true" />}>
          {t('orgs.add')}
        </Button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label={t('orgs.title')}
          value={status}
          onChange={(s) => update({ status: s })}
          tabs={ORG_STATUSES.map((s) => ({
            value: s,
            label: t(`status.${s}`),
            badge: counts[s] ? <Badge variant={s === 'pending' ? 'pending' : 'neutral'}>{counts[s]}</Badge> : null,
          }))}
        />
        <Input
          className="w-full sm:w-72"
          label={t('programme.filters.search')}
          placeholder={t('orgs.searchPlaceholder')}
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
          title={t('orgs.loadError')}
          action={<Button onClick={() => query.refetch()}>{t('actions.retry')}</Button>}
        />
      )}
      {query.data?.items.length === 0 && (
        <Card>
          <EmptyState
            illustration={<Building2 size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('orgs.emptyTitle', { status: t(`status.${status}`).toLowerCase() })}
            description={t('orgs.emptyText')}
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
              aria-label={t('orgs.bulk.region')}
            >
              <p className="text-sm font-semibold text-emerald-darker">{t('orgs.bulk.selected', { count: selectedCount })}</p>
              {!allMatching && allOnPage && total > items.length && (
                <button type="button" className="text-sm font-semibold text-emerald underline" onClick={() => setAllMatching(true)}>
                  {t('orgs.bulk.selectAllMatching', { count: total, status: t(`status.${status}`).toLowerCase() })}
                </button>
              )}
              <div className="ml-auto flex flex-wrap gap-2">
                {actions.map((action) => {
                  const Icon = ACTION_ICONS[action];
                  return (
                    <Button
                      key={action}
                      size="sm"
                      variant={action === 'delete' ? 'danger' : 'outline'}
                      onClick={() => setConfirming(action)}
                      disabled={bulk.isPending}
                      leftIcon={<Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
                    >
                      {t(`orgs.bulk.actions.${status === 'suspended' && action === 'approve' ? 'reactivate' : action}`)}
                    </Button>
                  );
                })}
                <Button size="sm" variant="ghost" onClick={clearSelection} leftIcon={<X size={16} strokeWidth={1.75} aria-hidden="true" />}>
                  {t('orgs.bulk.clear')}
                </Button>
              </div>
            </div>
          )}

          <Card padded={false} className="overflow-hidden">
            <table className="hidden w-full text-left md:table">
              <thead className="bg-cream-dark text-xs uppercase text-ink-muted">
                <tr>
                  <th scope="col" className="w-12 py-3 pl-5">
                    <Checkbox
                      checked={allOnPage || allMatching}
                      indeterminate={!allOnPage && someOnPage}
                      onChange={togglePage}
                      label={t('orgs.bulk.selectPage')}
                    />
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('orgs.columns.organization')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('orgs.columns.contact')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('orgs.columns.employees')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('orgs.columns.registered')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('orgs.columns.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((o) => {
                  const isSelected = allMatching || selected.has(o.id);
                  return (
                    <tr key={o.id} className={isSelected ? 'bg-mint-soft' : 'hover:bg-mint-soft'}>
                      <td className="py-3 pl-5">
                        <Checkbox checked={isSelected} onChange={() => toggle(o.id)} label={t('orgs.bulk.selectOne', { name: o.name })} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {o.logo?.url ? (
                            <img src={o.logo.url} alt="" className="h-10 w-10 rounded-lg border border-line bg-surface object-contain p-0.5" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint-soft text-emerald">
                              <Building2 size={18} strokeWidth={1.75} aria-hidden="true" />
                            </span>
                          )}
                          <div>
                            <Link to={`/admin/organizations/${o.id}`} className="font-medium text-ink hover:text-emerald hover:underline">
                              {o.name}
                            </Link>
                            <p className="text-xs text-ink-muted">{[o.industry, o.country].filter(Boolean).join(' · ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm">
                        {o.owner?.name}
                        <p className="text-xs text-ink-muted">{o.owner?.email}</p>
                      </td>
                      <td className="px-5 py-3 text-sm">{o.employeeCount}</td>
                      <td className="px-5 py-3 text-sm">{fmt.format(new Date(o.createdAt))}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Phone layout */}
            <div className="flex items-center gap-3 border-b border-line bg-cream-dark px-4 py-2.5 md:hidden">
              <Checkbox
                checked={allOnPage || allMatching}
                indeterminate={!allOnPage && someOnPage}
                onChange={togglePage}
                label={t('orgs.bulk.selectPage')}
              />
              <span className="text-xs font-semibold uppercase text-ink-muted">{t('orgs.bulk.selectPage')}</span>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {items.map((o) => {
                const isSelected = allMatching || selected.has(o.id);
                return (
                  <li key={o.id} className={`flex gap-3 p-4 ${isSelected ? 'bg-mint-soft' : ''}`}>
                    <div className="pt-1">
                      <Checkbox checked={isSelected} onChange={() => toggle(o.id)} label={t('orgs.bulk.selectOne', { name: o.name })} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/admin/organizations/${o.id}`} className="font-medium text-ink hover:text-emerald">
                          {o.name}
                        </Link>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="text-sm text-ink-muted">
                        {o.owner?.email} · {t('orgs.employeeCount', { count: o.employeeCount })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Pagination page={query.data.page} pages={query.data.pages} onChange={(p) => update({ page: p })} />
        </>
      )}

      <ConfirmDialog
        open={!!confirming}
        onClose={() => !bulk.isPending && setConfirming(null)}
        onConfirm={() => run(confirming)}
        loading={bulk.isPending}
        variant={confirming === 'delete' || confirming === 'suspend' ? 'danger' : 'primary'}
        title={confirming ? t(`orgs.bulk.confirm.${confirming}.title`, { count: selectedCount }) : ''}
        description={confirming ? t(`orgs.bulk.confirm.${confirming}.text`, { count: selectedCount }) : ''}
        confirmLabel={
          confirming ? t(`orgs.bulk.actions.${status === 'suspended' && confirming === 'approve' ? 'reactivate' : confirming}`) : undefined
        }
      />
    </div>
  );
}
