import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Pencil, Send, Trash2, UserCheck, UserX } from 'lucide-react';
import { Alert, Button, Card, EmptyState, PageSpinner, ProgressBar, toast } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import UserFormModal from '../../components/shared/UserFormModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import ProfileSummary from '../../features/profile/ProfileSummary.jsx';
import RemarksPanel from '../../features/organizations/RemarksPanel.jsx';
import {
  useDeactivateEmployee,
  useDeleteEmployee,
  useEmployee,
  useSubmitEmployee,
  useUpdateEmployee,
} from '../../features/organizations/hooks.js';
import PathwayOverview from '../../features/recommendations/PathwayOverview.jsx';
import EnrollmentCard from '../../features/enrollments/EnrollmentCard.jsx';
import EnrollOnBehalf from '../../features/enrollments/EnrollOnBehalf.jsx';
import PaymentSimulator from '../../features/enrollments/PaymentSimulator.jsx';
import RequestEnrollmentButton from '../../features/enrollments/RequestEnrollmentButton.jsx';

/** /org/employees/:id — profile (read-only), remarks, submit to C2B, published pathway, enrollments. */
export default function EmployeeDetail() {
  const { id } = useParams();
  const { t } = useTranslation('org');
  const { organization } = useAuth();
  const query = useEmployee(id);
  const submit = useSubmitEmployee();
  const deactivate = useDeactivateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null); // 'submit' | 'deactivate' | 'delete'
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(null);

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return (
      <EmptyState
        illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('employees.notFound')}
        action={
          <Button as={Link} to="/org/employees">
            {t('employees.back')}
          </Button>
        }
      />
    );
  }

  const { employee, profile, pathway, enrollments = [] } = query.data;
  const canEnroll = employee.isActive && organization.status === 'approved';
  const submitted = ['submitted', 'under_review', 'pathway_published'].includes(profile.status);
  const ready = profile.status === 'complete' && profile.completionPercent >= 80;
  const canSubmit = ready && employee.isActive && organization.status === 'approved';

  const run = () => {
    if (confirm === 'delete') {
      deleteEmployee.mutate(id, {
        onSuccess: () => {
          toast.success(t('employees.deleted', { name: employee.name }));
          navigate('/org/employees', { replace: true });
        },
        onError: (err) => {
          toast.apiError(err);
          setConfirm(null);
        },
      });
      return;
    }
    const mutation = confirm === 'submit' ? submit : deactivate;
    mutation.mutate(id, {
      onSuccess: () => {
        toast.success(confirm === 'submit' ? t('employees.submitted') : t('employees.deactivated'));
        setConfirm(null);
      },
      onError: (err) => {
        toast.apiError(err);
        setConfirm(null);
      },
    });
  };

  const reactivate = () =>
    updateEmployee.mutate(
      { id, body: { isActive: true } },
      { onSuccess: () => toast.success(t('employees.reactivated', { name: employee.name })), onError: toast.apiError },
    );

  const onEdit = async (values) => {
    await updateEmployee.mutateAsync({ id, body: values });
    toast.success(t('employees.updated', { name: values.name }));
    setEditing(false);
  };

  const dialogCopy = {
    submit: { title: t('employees.submitTitle'), text: t('employees.submitText', { name: employee.name }), label: t('employees.submit') },
    deactivate: {
      title: t('employees.deactivateTitle'),
      text: t('employees.deactivateText', { name: employee.name }),
      label: t('employees.deactivate'),
    },
    delete: { title: t('employees.deleteTitle'), text: t('employees.deleteText', { name: employee.name }), label: t('actions.delete', { ns: 'common' }) },
  }[confirm ?? 'submit'];

  return (
    <div className="space-y-6">
      <Button as={Link} to="/org/employees" variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}>
        {t('employees.back')}
      </Button>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {employee.avatar?.url ? (
              <img src={employee.avatar.url} alt="" className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mint font-display text-xl font-bold text-emerald-darker">
                {employee.name[0]?.toUpperCase()}
              </span>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold">{employee.name}</h1>
              <p className="text-sm text-ink-muted">
                {employee.email}
                {employee.department && ` · ${employee.department}`}
                {employee.jobTitle && ` · ${employee.jobTitle}`}
              </p>
            </div>
          </div>
          <StatusBadge status={employee.isActive ? profile.status : 'suspended'} />
        </div>

        <ProgressBar value={profile.completionPercent} label={t('employees.columns.completion')} />

        {!employee.isActive && <Alert variant="warning">{t('employees.inactiveNotice')}</Alert>}
        {submitted && employee.isActive && <Alert variant="success">{t('employees.alreadySubmitted')}</Alert>}
        {!submitted && !ready && employee.isActive && <Alert variant="info">{t('employees.notReady')}</Alert>}

        <div className="flex flex-wrap gap-3">
          {!submitted && (
            <Button
              onClick={() => setConfirm('submit')}
              disabled={!canSubmit}
              leftIcon={<Send size={18} strokeWidth={1.75} aria-hidden="true" />}
            >
              {t('employees.submit')}
            </Button>
          )}
          {employee.isActive && (
            <Button
              variant="ghost"
              className="text-danger"
              onClick={() => setConfirm('deactivate')}
              leftIcon={<UserX size={18} strokeWidth={1.75} aria-hidden="true" />}
            >
              {t('employees.deactivate')}
            </Button>
          )}
          {!employee.isActive && (
            <Button
              variant="outline"
              onClick={reactivate}
              loading={updateEmployee.isPending && !editing}
              leftIcon={<UserCheck size={18} strokeWidth={1.75} aria-hidden="true" />}
            >
              {t('employees.reactivate')}
            </Button>
          )}
          <Button variant="ghost" onClick={() => setEditing(true)} leftIcon={<Pencil size={18} strokeWidth={1.75} aria-hidden="true" />}>
            {t('actions.edit', { ns: 'common' })}
          </Button>
          <Button
            variant="ghost"
            className="text-danger"
            onClick={() => setConfirm('delete')}
            leftIcon={<Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />}
          >
            {t('actions.delete', { ns: 'common' })}
          </Button>
        </div>
      </Card>

      <UserFormModal
        open={editing}
        onClose={() => setEditing(false)}
        mode="edit"
        user={employee}
        emailEditable={false}
        canDeactivate={false}
        onSubmit={onEdit}
        loading={updateEmployee.isPending}
        title={t('employees.editTitle')}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">{t('employees.profileTitle')}</h2>
          <ProfileSummary profile={profile} />
        </div>
        <RemarksPanel employeeId={id} remarks={profile.orgRemarks} />
      </div>

      <section aria-labelledby="employee-pathway" className="space-y-4">
        <h2 id="employee-pathway" className="font-display text-xl font-semibold">
          {t('employees.pathwayTitle')}
        </h2>
        {pathway ? (
          <PathwayOverview
            pathway={pathway}
            compact
            renderAction={(step) =>
              canEnroll &&
              !step.programme?.missing && (
                <RequestEnrollmentButton
                  programme={step.programme}
                  enrollments={enrollments}
                  recommendationId={pathway.id}
                  learnerId={employee.id}
                  learnerLink="/org/enrollments"
                />
              )
            }
          />
        ) : (
          <Card>
            <p className="text-ink-muted">{t('employees.noPathway')}</p>
          </Card>
        )}
      </section>

      <section aria-labelledby="employee-enrollments" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="employee-enrollments" className="font-display text-xl font-semibold">
            {t('employees.enrollmentsTitle')}
          </h2>
          <EnrollOnBehalf employeeId={employee.id} enrollments={enrollments} disabled={!canEnroll} />
        </div>
        {enrollments.length === 0 ? (
          <Card>
            <p className="text-ink-muted">{t('employees.noEnrollments')}</p>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {enrollments.map((e) => (
              <EnrollmentCard key={e.id} enrollment={e} onPay={setPaying} />
            ))}
          </div>
        )}
      </section>

      <PaymentSimulator key={paying?.id} enrollment={paying} open={!!paying} onClose={() => setPaying(null)} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={run}
        loading={submit.isPending || deactivate.isPending || deleteEmployee.isPending}
        variant={confirm === 'submit' ? 'primary' : 'danger'}
        title={dialogCopy.title}
        description={dialogCopy.text}
        confirmLabel={dialogCopy.label}
      />
    </div>
  );
}
