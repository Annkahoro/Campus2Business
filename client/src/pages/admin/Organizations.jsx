import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Building2, Plus } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Pagination, Spinner, Tabs } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { ORG_STATUSES } from '../../features/organizations/constants.js';
import { useAdminOrgs } from '../../features/organizations/hooks.js';

/** /admin/organizations — tabs Pending / Approved / Rejected / Suspended (docs/09). */
export default function Organizations() {
  const { t, i18n } = useTranslation('admin');
  const [params, setParams] = useSearchParams();
  const status = ORG_STATUSES.includes(params.get('status')) ? params.get('status') : 'pending';
  const search = params.get('search') ?? '';
  const page = Number(params.get('page')) || 1;
  const query = useAdminOrgs({ status, search, page });
  const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' });

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  const counts = query.data?.counts ?? {};

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

      {query.data?.items.length > 0 && (
        <>
          <Card padded={false} className="overflow-hidden">
            <table className="hidden w-full text-left md:table">
              <thead className="bg-cream-dark text-xs uppercase text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('orgs.columns.organization')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('orgs.columns.contact')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('orgs.columns.employees')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('orgs.columns.registered')}</th>
                  <th scope="col" className="px-5 py-3 font-semibold">{t('orgs.columns.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {query.data.items.map((o) => (
                  <tr key={o.id} className="hover:bg-mint-soft">
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
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {query.data.items.map((o) => (
                <li key={o.id} className="space-y-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/admin/organizations/${o.id}`} className="font-medium text-ink hover:text-emerald">
                      {o.name}
                    </Link>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-sm text-ink-muted">
                    {o.owner?.email} · {t('orgs.employeeCount', { count: o.employeeCount })}
                  </p>
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
