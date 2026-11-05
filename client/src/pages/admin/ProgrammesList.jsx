import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, BookOpen, Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Input, Pagination, Select, Spinner, toast } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import { loc } from '../../lib/localized.js';
import { CATEGORIES, PROGRAMME_STATUSES, coverFor } from '../../features/programmes/constants.js';
import { categoryLabel, formatPrice } from '../../features/programmes/format.js';
import { useAdminProgrammes, useDeleteProgramme, useSetProgrammeStatus } from '../../features/programmes/hooks.js';

const iconBtn =
  'rounded-lg p-2 text-ink-muted hover:bg-mint-soft hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald disabled:opacity-50';

export default function ProgrammesList() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const [params, setParams] = useSearchParams();
  const filters = {
    search: params.get('search') ?? '',
    status: params.get('status') ?? '',
    category: params.get('category') ?? '',
    page: Number(params.get('page')) || 1,
  };
  const [toDelete, setToDelete] = useState(null);

  const query = useAdminProgrammes({ ...filters, limit: 20 });
  const setStatus = useSetProgrammeStatus();
  const remove = useDeleteProgramme();

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  const togglePublish = (p) => {
    const status = p.status === 'published' ? 'draft' : 'published';
    setStatus.mutate(
      { id: p.id, status },
      {
        onSuccess: () => toast.success(t('admin:programmes.statusUpdated', { status: t(`status.${status}`) })),
        onError: toast.apiError,
      },
    );
  };

  const confirmDelete = () =>
    remove.mutate(toDelete.id, {
      onSuccess: (res) => {
        toast.success(res.archived ? t('admin:programmes.archivedInstead') : t('admin:programmes.deleted'));
        setToDelete(null);
      },
      onError: toast.apiError,
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('admin:programmes.title')}</h1>
          <p className="mt-1 text-ink-muted">{t('admin:programmes.subtitle')}</p>
        </div>
        <Button as={Link} to="/admin/programmes/new" leftIcon={<Plus size={18} strokeWidth={1.75} aria-hidden="true" />}>
          {t('admin:programmes.new')}
        </Button>
      </div>

      <Card className="grid gap-4 p-4 sm:grid-cols-3" padded={false}>
        <Input
            label={t('programme.filters.search')}
            placeholder={t('admin:programmes.searchPlaceholder')}
            defaultValue={filters.search}
            onKeyDown={(e) => e.key === 'Enter' && update({ search: e.currentTarget.value.trim() })}
            onBlur={(e) => e.currentTarget.value.trim() !== filters.search && update({ search: e.currentTarget.value.trim() })}
          />
          <Select
            label={t('admin:programmes.columns.status')}
            placeholder={t('programme.filters.all')}
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
            options={PROGRAMME_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
          />
          <Select
            label={t('programme.filters.category')}
            placeholder={t('programme.filters.all')}
            value={filters.category}
            onChange={(e) => update({ category: e.target.value })}
            options={CATEGORIES.map((c) => ({ value: c, label: categoryLabel(t, c) }))}
          />
      </Card>

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
      {query.data?.items.length === 0 && (
        <Card>
          <EmptyState
            illustration={<BookOpen size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('admin:programmes.emptyTitle')}
            description={t('admin:programmes.emptyText')}
            action={
              <Button as={Link} to="/admin/programmes/new">
                {t('admin:programmes.new')}
              </Button>
            }
          />
        </Card>
      )}

      {query.data?.items.length > 0 && (
        <>
          <Card padded={false} className="overflow-hidden">
            {/* Table (md+) */}
            <table className="hidden w-full text-left md:table">
              <thead className="bg-cream-dark text-xs uppercase text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('admin:programmes.columns.programme')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('admin:programmes.columns.category')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('admin:programmes.columns.level')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('admin:programmes.columns.price')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('admin:programmes.columns.status')}</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">{t('admin:programmes.columns.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {query.data.items.map((p) => (
                  <tr key={p.id} className="hover:bg-mint-soft">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img src={coverFor(p)} alt="" loading="lazy" className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                        <div>
                          <Link to={`/admin/programmes/${p.id}`} className="font-medium text-ink hover:text-emerald hover:underline">
                            {loc(p.title, lang)}
                          </Link>
                          {p.code && <p className="text-xs text-ink-muted">{p.code}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm">{categoryLabel(t, p.category)}</td>
                    <td className="px-5 py-3 text-sm">{t(`programme.levels.${p.level}`)}</td>
                    <td className="px-5 py-3 text-sm">{formatPrice(p.price, lang, t) ?? '—'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3">
                      <RowActions p={p} onToggle={togglePublish} onDelete={setToDelete} busy={setStatus.isPending} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Stacked cards (mobile) */}
            <ul className="divide-y divide-line md:hidden">
              {query.data.items.map((p) => (
                <li key={p.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/admin/programmes/${p.id}`} className="font-medium text-ink hover:text-emerald">
                      {loc(p.title, lang)}
                    </Link>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-sm text-ink-muted">
                    {categoryLabel(t, p.category)} · {t(`programme.levels.${p.level}`)}
                    {formatPrice(p.price, lang, t) && ` · ${formatPrice(p.price, lang, t)}`}
                  </p>
                  <RowActions p={p} onToggle={togglePublish} onDelete={setToDelete} busy={setStatus.isPending} />
                </li>
              ))}
            </ul>
          </Card>
          <Pagination page={query.data.page} pages={query.data.pages} onChange={(page) => update({ page })} />
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title={t('admin:programmes.deleteTitle')}
        description={t('admin:programmes.deleteText', { title: toDelete ? loc(toDelete.title, lang) : '' })}
        confirmLabel={t('actions.delete')}
      />
    </div>
  );
}

function RowActions({ p, onToggle, onDelete, busy }) {
  const { t } = useTranslation();
  const published = p.status === 'published';
  return (
    <div className="flex items-center justify-end gap-1">
      <Link to={`/admin/programmes/${p.id}/edit`} className={iconBtn} aria-label={t('actions.edit')} title={t('actions.edit')}>
        <Pencil size={18} strokeWidth={1.75} aria-hidden="true" />
      </Link>
      <button
        type="button"
        className={iconBtn}
        disabled={busy}
        onClick={() => onToggle(p)}
        aria-label={published ? t('admin:programmes.unpublish') : t('admin:programmes.publish')}
        title={published ? t('admin:programmes.unpublish') : t('admin:programmes.publish')}
      >
        {published ? <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.75} aria-hidden="true" />}
      </button>
      <button
        type="button"
        className={`${iconBtn} hover:text-danger`}
        onClick={() => onDelete(p)}
        aria-label={t('actions.delete')}
        title={t('actions.delete')}
      >
        <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
