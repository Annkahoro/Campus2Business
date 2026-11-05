import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Pagination, Spinner, Tabs } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { useRecommendations } from '../../features/recommendations/hooks.js';
import { QUEUE_TABS } from '../../features/recommendations/constants.js';

/** /admin/recommendations — Pending review / Generating / Approved / Published / Failed / Rejected (docs/09). */
export default function Recommendations() {
  const { t, i18n } = useTranslation('pathway');
  const [params, setParams] = useSearchParams();
  const status = QUEUE_TABS.includes(params.get('status')) ? params.get('status') : 'pending_review';
  const search = params.get('search') ?? '';
  const page = Number(params.get('page')) || 1;
  const query = useRecommendations({ status, search, page });
  const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' });
  const counts = query.data?.counts ?? {};

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  const items = query.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('queue.title')}</h1>
        <p className="mt-1 text-ink-muted">{t('queue.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label={t('queue.title')}
          value={status}
          onChange={(s) => update({ status: s })}
          className="flex-wrap"
          tabs={QUEUE_TABS.map((s) => ({
            value: s,
            label: t(`status.${s}`),
            badge: counts[s] ? (
              <Badge variant={s === 'pending_review' ? 'pending' : s === 'failed' ? 'danger' : 'neutral'}>{counts[s]}</Badge>
            ) : null,
          }))}
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
          title={t('queue.loadError')}
          action={<Button onClick={() => query.refetch()}>{t('actions.retry')}</Button>}
        />
      )}
      {query.data && items.length === 0 && (
        <Card>
          <EmptyState
            illustration={<Sparkles size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('queue.emptyTitle', { status: t(`status.${status}`).toLowerCase() })}
            description={t('queue.emptyText')}
            action={
              <Button as={Link} to="/admin/learners?status=submitted" variant="outline">
                {t('queue.findLearners')}
              </Button>
            }
          />
        </Card>
      )}

      {items.length > 0 && (
        <>
          <Card padded={false} className="overflow-hidden">
            <table className="hidden w-full text-left md:table">
              <thead className="bg-cream-dark text-xs uppercase text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('learners.columns.learner')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('queue.columns.version')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('queue.columns.steps')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('queue.columns.confidence')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('queue.columns.updated')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('queue.columns.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-mint-soft">
                    <td className="px-5 py-3">
                      <Link to={`/admin/recommendations/${r.id}`} className="font-medium text-ink hover:text-emerald hover:underline">
                        {r.learner.name}
                      </Link>
                      <p className="text-xs text-ink-muted">
                        {t(`learners.types.${r.learnerType}`)}
                        {r.organization && ` · ${r.organization.name}`}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-sm">v{r.version}</td>
                    <td className="px-5 py-3 text-sm">{r.status === 'generating' ? '—' : r.steps}</td>
                    <td className="px-5 py-3 text-sm">{r.confidence !== null ? `${r.confidence}%` : '—'}</td>
                    <td className="px-5 py-3 text-sm">{fmt.format(new Date(r.updatedAt))}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {r.status === 'generating' && (
                          <Loader2 size={16} strokeWidth={2} className="animate-spin text-info" aria-hidden="true" />
                        )}
                        <StatusBadge status={r.status} />
                      </div>
                      {r.status === 'failed' && r.failureReason && (
                        <p className="mt-1 max-w-xs truncate text-xs text-danger" title={r.failureReason}>
                          {r.failureReason}
                        </p>
                      )}
                      {r.rejectionReason === 'SUPERSEDED' && <p className="mt-1 text-xs text-ink-muted">{t('admin.superseded')}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {items.map((r) => (
                <li key={r.id}>
                  <Link to={`/admin/recommendations/${r.id}`} className="block space-y-1 p-4 hover:bg-mint-soft focus-visible:bg-mint-soft focus-visible:outline-none">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-ink">{r.learner.name}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-ink-muted">
                      v{r.version} · {t(`learners.types.${r.learnerType}`)}
                      {r.organization && ` · ${r.organization.name}`}
                      {r.confidence !== null && ` · ${t('queue.columns.confidence')} ${r.confidence}%`}
                    </p>
                    <p className="text-xs text-ink-muted">{fmt.format(new Date(r.updatedAt))}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Pagination page={query.data.page} pages={query.data.pages} onChange={(p) => update({ page: p })} />
        </>
      )}
    </div>
  );
}
