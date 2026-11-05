import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Copy, GraduationCap, Route, Send, Users } from 'lucide-react';
import { Button, Card, CardHeader, ProgressBar, Spinner, toast } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import OrgStatusNotice from '../../features/organizations/OrgStatusNotice.jsx';
import { useEmployees, useInvites } from '../../features/organizations/hooks.js';
import { copyText } from '../../lib/clipboard.js';
import { useOrgReport } from '../../features/reports/hooks.js';

function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mint-soft text-emerald">
        <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div>
        <p className="font-display text-2xl font-bold text-ink">{value}</p>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </Card>
  );
}

function ApprovedDashboard({ approved }) {
  const { t } = useTranslation('org');
  const employees = useEmployees();
  const invites = useInvites(approved); // invite routes return ORG_NOT_APPROVED while suspended
  const rows = employees.data ?? [];
  const defaultInvite = invites.data?.find((i) => i.state === 'active');

  const report = useOrgReport();
  const stats = report.data?.cards ?? {};

  const copy = async () => {
    if (await copyText(defaultInvite.url)) toast.success(t('invites.copied'));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat icon={Users} label={t('dashboard.stats.joined')} value={stats.joined ?? '—'} />
        <Stat icon={CheckCircle2} label={t('dashboard.stats.complete')} value={stats.complete ?? '—'} />
        <Stat icon={Send} label={t('dashboard.stats.submitted')} value={stats.submitted ?? '—'} />
        <Stat icon={Route} label={t('dashboard.stats.published')} value={stats.published ?? '—'} />
        <Stat icon={GraduationCap} label={t('dashboard.stats.activeEnrollments')} value={stats.activeEnrollments ?? '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title={t('dashboard.inviteTitle')} description={t('dashboard.inviteText')} />
          {!approved && <p className="text-sm text-ink-muted">{t('invites.notApprovedText')}</p>}
          {approved && invites.isPending && <Spinner className="text-emerald" />}
          {defaultInvite ? (
            <div className="space-y-3">
              <p className="break-all rounded-lg bg-cream p-3 font-mono text-xs text-ink">{defaultInvite.url}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={copy} leftIcon={<Copy size={16} strokeWidth={1.75} aria-hidden="true" />}>
                  {t('actions.copy')}
                </Button>
                <Button as={Link} to="/org/invites" size="sm" variant="ghost">
                  {t('dashboard.manageInvites')}
                </Button>
              </div>
            </div>
          ) : (
            invites.data && (
              <Button as={Link} to="/org/invites" size="sm">
                {t('invites.new')}
              </Button>
            )
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={t('dashboard.recentTitle')}
            action={
              <Button as={Link} to="/org/employees" variant="ghost" size="sm">
                {t('dashboard.viewAll')}
              </Button>
            }
          />
          {employees.isPending && <Spinner className="text-emerald" />}
          {rows.length === 0 && employees.data && <p className="text-sm text-ink-muted">{t('employees.emptyText')}</p>}
          <ul className="divide-y divide-line">
            {rows.slice(0, 5).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <Link to={`/org/employees/${r.id}`} className="min-w-0 flex-1 font-medium text-ink hover:text-emerald">
                  {r.name}
                  <span className="block text-xs font-normal text-ink-muted">{r.department || '—'}</span>
                </Link>
                <ProgressBar value={r.completionPercent} size="sm" className="w-28" showValue={false} label={t('employees.columns.completion')} />
                <span className="w-10 text-right text-sm text-ink-muted">{r.completionPercent}%</span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/** /org — status-aware dashboard (docs/09). */
export default function OrgDashboard() {
  const { t } = useTranslation('org');
  const { organization } = useAuth();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        {organization.logo?.url && <img src={organization.logo.url} alt="" className="h-14 w-14 rounded-xl border border-line bg-surface object-contain p-1" />}
        <div>
          <p className="text-sm text-ink-muted">{t('title')}</p>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{organization.name}</h1>
        </div>
        <StatusBadge status={organization.status} />
      </div>

      <OrgStatusNotice organization={organization} />
      {['approved', 'suspended'].includes(organization.status) && (
        <ApprovedDashboard approved={organization.status === 'approved'} />
      )}
    </div>
  );
}
