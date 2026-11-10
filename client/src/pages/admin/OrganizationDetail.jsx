import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Ban, Building2, Check, Pencil, Trash2, X } from 'lucide-react';
import { Alert, Button, Card, CardHeader, EmptyState, Modal, PageSpinner, ProgressBar, Textarea, toast } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import { useAdminDeleteOrg, useAdminOrg, useApproveOrg, useRejectOrg, useSuspendOrg } from '../../features/organizations/hooks.js';

const Chips = ({ items, empty }) =>
  items?.length ? (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <li key={x} className="rounded-full bg-mint-soft px-2.5 py-0.5 text-sm text-emerald-darker">
          {x}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm italic text-ink-muted">{empty}</p>
  );

const Row = ({ label, children }) => (
  <div className="grid gap-1 py-1.5 sm:grid-cols-[180px_1fr]">
    <dt className="text-sm text-ink-muted">{label}</dt>
    <dd className="text-sm text-ink">{children || '—'}</dd>
  </div>
);

function RejectModal({ open, onClose, onConfirm, loading }) {
  const { t } = useTranslation('admin');
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const submit = () => {
    if (reason.trim().length < 3) return setError('validation.required');
    return onConfirm(reason.trim());
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('orgs.rejectTitle')}
      description={t('orgs.rejectText')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button variant="danger" onClick={submit} loading={loading}>
            {t('orgs.reject')}
          </Button>
        </>
      }
    >
      <Textarea
        label={t('orgs.reason')}
        rows={4}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setError(null);
        }}
        placeholder={t('orgs.reasonPlaceholder')}
        error={error}
        required
      />
    </Modal>
  );
}

/** /admin/organizations/:id — review and decide (docs/09). */
export default function OrganizationDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation('admin');
  const query = useAdminOrg(id);
  const approve = useApproveOrg();
  const reject = useRejectOrg();
  const suspend = useSuspendOrg();
  const remove = useAdminDeleteOrg();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null); // 'approve' | 'reject' | 'suspend' | 'delete'
  const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' });

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return (
      <EmptyState
        illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('orgs.notFound')}
        action={
          <Button as={Link} to="/admin/organizations">
            {t('orgs.back')}
          </Button>
        }
      />
    );
  }

  const { organization: o, stats, employees } = query.data;
  const done = (key) => ({
    onSuccess: () => {
      toast.success(t(`orgs.${key}Done`, { name: o.name }));
      setDialog(null);
    },
    onError: (err) => {
      toast.apiError(err);
      setDialog(null);
    },
  });

  return (
    <div className="space-y-6">
      <Button as={Link} to={`/admin/organizations?status=${o.status}`} variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}>
        {t('orgs.back')}
      </Button>

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {o.logo?.url ? (
            <img src={o.logo.url} alt="" className="h-16 w-16 rounded-xl border border-line bg-surface object-contain p-1" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-mint-soft text-emerald">
              <Building2 size={28} strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{o.name}</h1>
              <StatusBadge status={o.status} />
            </div>
            <p className="text-sm text-ink-muted">
              {t('orgs.registeredBy', { name: o.owner?.name, email: o.owner?.email, date: fmt.format(new Date(o.createdAt)) })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['pending', 'suspended'].includes(o.status) && (
            <Button onClick={() => setDialog('approve')} leftIcon={<Check size={18} strokeWidth={1.75} aria-hidden="true" />}>
              {t('orgs.approve')}
            </Button>
          )}
          {o.status === 'pending' && (
            <Button variant="outline" className="border-danger text-danger" onClick={() => setDialog('reject')} leftIcon={<X size={18} strokeWidth={1.75} aria-hidden="true" />}>
              {t('orgs.reject')}
            </Button>
          )}
          {o.status === 'approved' && (
            <Button variant="ghost" className="text-danger" onClick={() => setDialog('suspend')} leftIcon={<Ban size={18} strokeWidth={1.75} aria-hidden="true" />}>
              {t('orgs.suspend')}
            </Button>
          )}
          <Button as={Link} to={`/admin/organizations/${id}/edit`} variant="ghost" leftIcon={<Pencil size={18} strokeWidth={1.75} aria-hidden="true" />}>
            {t('actions.edit', { ns: 'common' })}
          </Button>
          <Button variant="ghost" className="text-danger" onClick={() => setDialog('delete')} leftIcon={<Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />}>
            {t('actions.delete', { ns: 'common' })}
          </Button>
        </div>
      </Card>

      {o.status === 'rejected' && o.rejectionReason && (
        <Alert variant="danger" title={t('orgs.rejectedReason')}>
          {o.rejectionReason}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('orgs.sections.details')} />
          <dl>
            <Row label={t('org:form.industry')}>{o.industry}</Row>
            <Row label={t('org:form.size')}>{o.size && t('org:form.sizeOption', { size: o.size })}</Row>
            <Row label={t('org:form.city')}>{[o.city, o.country].filter(Boolean).join(', ')}</Row>
            <Row label={t('org:form.website')}>
              {o.website && (
                <a href={o.website} target="_blank" rel="noreferrer" className="text-emerald hover:underline">
                  {o.website}
                </a>
              )}
            </Row>
            <Row label={t('org:form.trainingBudget')}>{t(`org:form.budgets.${o.trainingBudget}`)}</Row>
            <Row label={t('org:form.digitalMaturity')}>{o.digitalMaturity && `${o.digitalMaturity}/5`}</Row>
          </dl>
          {o.description && <p className="mt-3 whitespace-pre-line text-sm text-ink">{o.description}</p>}
        </Card>

        <Card>
          <CardHeader title={t('orgs.sections.contact')} />
          <dl>
            <Row label={t('org:form.contactName')}>{o.contactPerson?.name}</Row>
            <Row label={t('org:form.contactPosition')}>{o.contactPerson?.position}</Row>
            <Row label={t('org:form.contactEmail')}>{o.contactPerson?.email}</Row>
            <Row label={t('org:form.contactPhone')}>{o.contactPerson?.phone}</Row>
          </dl>
          <h3 className="mb-2 mt-5 text-sm font-semibold">{t('org:form.sections.departments')}</h3>
          <ul className="flex flex-wrap gap-2">
            {o.departments.map((d) => (
              <li key={d.name} className="rounded-full border border-line px-3 py-1 text-sm">
                {d.name}
                {d.headcount !== null && <span className="text-ink-muted"> · {d.headcount}</span>}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t('org:form.sections.training')} />
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('org:form.goals')}</h3>
              <Chips items={o.goals} empty={t('orgs.none')} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('org:form.objectives')}</h3>
              <Chips items={o.objectives} empty={t('orgs.none')} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">{t('org:form.skillGaps')}</h3>
              <Chips items={o.skillGaps} empty={t('orgs.none')} />
            </div>
          </div>
          {o.additionalInfo && <p className="mt-4 whitespace-pre-line text-sm text-ink">{o.additionalInfo}</p>}
        </Card>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
          <h2 className="font-display text-xl font-semibold">{t('orgs.sections.employees')}</h2>
          <p className="text-sm text-ink-muted">
            {t('orgs.employeeStats', { employees: stats.employees, complete: stats.complete, submitted: stats.submitted })}
          </p>
        </div>
        {employees.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-ink-muted">{t('orgs.noEmployees')}</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {employees.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{e.name}</p>
                  <p className="text-xs text-ink-muted">
                    {e.email} · {e.department || '—'}
                  </p>
                </div>
                <ProgressBar value={e.completionPercent} size="sm" showValue={false} className="w-24" label={t('orgs.completion')} />
                <span className="w-10 text-right text-sm text-ink-muted">{e.completionPercent}%</span>
                <StatusBadge status={e.isActive ? e.status : 'suspended'} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={dialog === 'approve'}
        onClose={() => setDialog(null)}
        onConfirm={() => approve.mutate(id, done('approve'))}
        loading={approve.isPending}
        variant="primary"
        title={t('orgs.approveTitle')}
        description={t('orgs.approveText', { name: o.name })}
        confirmLabel={t('orgs.approve')}
      />
      <ConfirmDialog
        open={dialog === 'suspend'}
        onClose={() => setDialog(null)}
        onConfirm={() => suspend.mutate(id, done('suspend'))}
        loading={suspend.isPending}
        title={t('orgs.suspendTitle')}
        description={t('orgs.suspendText', { name: o.name })}
        confirmLabel={t('orgs.suspend')}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          remove.mutate(id, {
            onSuccess: (data) => {
              toast.success(t('orgs.deleteDone', { name: o.name, count: data?.convertedEmployees ?? 0 }));
              navigate('/admin/organizations', { replace: true });
            },
            onError: (err) => {
              toast.apiError(err);
              setDialog(null);
            },
          })
        }
        loading={remove.isPending}
        title={t('orgs.deleteTitle')}
        description={t('orgs.deleteText', { name: o.name, count: stats.employees })}
        confirmLabel={t('actions.delete', { ns: 'common' })}
      />
      {dialog === 'reject' && (
        <RejectModal open onClose={() => setDialog(null)} loading={reject.isPending} onConfirm={(reason) => reject.mutate({ id, reason }, done('reject'))} />
      )}
    </div>
  );
}
