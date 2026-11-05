import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, MessageSquare, Send, Users } from 'lucide-react';
import { Alert, Button, Card, EmptyState, Input, ProgressBar, Select, Spinner, toast } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { EMPLOYEE_PROFILE_STATUSES } from '../../features/organizations/constants.js';
import { useEmployees, useSubmitBulk } from '../../features/organizations/hooks.js';

const canSubmit = (row) => row.isActive && row.status === 'complete' && row.completionPercent >= 80;

/** /org/employees — table with filters and "Submit selected to C2B" (docs/09). */
export default function Employees() {
  const { t } = useTranslation('org');
  const { organization } = useAuth();
  const [params, setParams] = useSearchParams();
  const filters = {
    department: params.get('department') ?? '',
    status: params.get('status') ?? '',
    search: params.get('search') ?? '',
  };
  const query = useEmployees(filters);
  const bulk = useSubmitBulk();
  const [selected, setSelected] = useState(new Set());
  const [failures, setFailures] = useState([]);

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const eligible = rows.filter(canSubmit);
  const allEligibleSelected = eligible.length > 0 && eligible.every((r) => selected.has(r.id));
  const approved = organization.status === 'approved';

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => setSelected(allEligibleSelected ? new Set() : new Set(eligible.map((r) => r.id)));

  const submitSelected = () =>
    bulk.mutate([...selected], {
      onSuccess: (res) => {
        if (res.submitted) toast.success(t('employees.bulkSubmitted', { count: res.submitted }));
        setFailures(res.results.filter((r) => !r.ok));
        setSelected(new Set());
      },
      onError: toast.apiError,
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('employees.title')}</h1>
          <p className="mt-1 max-w-2xl text-ink-muted">{t('employees.subtitle')}</p>
        </div>
        {approved && (
          <Button
            onClick={submitSelected}
            disabled={selected.size === 0}
            loading={bulk.isPending}
            leftIcon={<Send size={18} strokeWidth={1.75} aria-hidden="true" />}
          >
            {t('employees.submitSelected', { count: selected.size })}
          </Button>
        )}
      </div>

      {failures.length > 0 && (
        <Alert variant="warning" title={t('employees.bulkFailedTitle')}>
          <ul className="list-inside list-disc">
            {failures.map((f) => (
              <li key={f.id}>
                {f.name ?? f.id}: {t(`errors:${f.code}`, { defaultValue: f.code })}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <Card className="grid gap-4 p-4 sm:grid-cols-3" padded={false}>
        <Input
          label={t('employees.search')}
          placeholder={t('employees.searchPlaceholder')}
          defaultValue={filters.search}
          onKeyDown={(e) => e.key === 'Enter' && update({ search: e.currentTarget.value.trim() })}
          onBlur={(e) => e.currentTarget.value.trim() !== filters.search && update({ search: e.currentTarget.value.trim() })}
        />
        <Select
          label={t('employees.columns.department')}
          placeholder={t('programme.filters.all')}
          value={filters.department}
          onChange={(e) => update({ department: e.target.value })}
          options={organization.departments.map((d) => ({ value: d.name, label: d.name }))}
        />
        <Select
          label={t('employees.columns.status')}
          placeholder={t('programme.filters.all')}
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          options={EMPLOYEE_PROFILE_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
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
          title={t('employees.loadError')}
          action={<Button onClick={() => query.refetch()}>{t('actions.retry')}</Button>}
        />
      )}
      {query.data && rows.length === 0 && (
        <Card>
          <EmptyState
            illustration={<Users size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('employees.emptyTitle')}
            description={t('employees.emptyText')}
            action={
              approved && (
                <Button as={Link} to="/org/invites">
                  {t('dashboard.manageInvites')}
                </Button>
              )
            }
          />
        </Card>
      )}

      {rows.length > 0 && (
        <Card padded={false} className="overflow-hidden">
          <table className="hidden w-full text-left md:table">
            <thead className="bg-cream-dark text-xs uppercase text-ink-muted">
              <tr>
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="accent-emerald"
                    checked={allEligibleSelected}
                    disabled={!approved || eligible.length === 0}
                    onChange={toggleAll}
                    aria-label={t('employees.selectAll')}
                  />
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('employees.columns.name')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('employees.columns.department')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('employees.columns.completion')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('employees.columns.status')}</th>
                <th scope="col" className="px-4 py-3 font-semibold">{t('employees.columns.remarks')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className={r.isActive ? 'hover:bg-mint-soft' : 'opacity-60'}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="accent-emerald"
                      checked={selected.has(r.id)}
                      disabled={!approved || !canSubmit(r)}
                      onChange={() => toggle(r.id)}
                      aria-label={t('employees.select', { name: r.name })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/org/employees/${r.id}`} className="font-medium text-ink hover:text-emerald hover:underline">
                      {r.name}
                    </Link>
                    <p className="text-xs text-ink-muted">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {r.department || '—'}
                    {r.jobTitle && <p className="text-xs text-ink-muted">{r.jobTitle}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={r.completionPercent} size="sm" showValue={false} className="w-24" label={t('employees.columns.completion')} />
                      <span className="text-sm text-ink-muted">{r.completionPercent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {r.isActive ? <StatusBadge status={r.status} /> : <StatusBadge status="suspended" />}
                  </td>
                  <td className="px-4 py-3 text-sm text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare size={14} strokeWidth={1.75} aria-hidden="true" />
                      {r.remarksCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-line md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  className="mt-1 accent-emerald"
                  checked={selected.has(r.id)}
                  disabled={!approved || !canSubmit(r)}
                  onChange={() => toggle(r.id)}
                  aria-label={t('employees.select', { name: r.name })}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/org/employees/${r.id}`} className="font-medium text-ink hover:text-emerald">
                      {r.name}
                    </Link>
                    <StatusBadge status={r.isActive ? r.status : 'suspended'} />
                  </div>
                  <p className="text-sm text-ink-muted">{r.department || '—'}</p>
                  <ProgressBar value={r.completionPercent} size="sm" label={t('employees.columns.completion')} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
