import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, Input, PageSpinner, PasswordInput, toast } from '../../components/ui/index.js';
import OrganizationForm from '../../features/organizations/OrganizationForm.jsx';
import { useAdminCreateOrg, useAdminOrg, useAdminUpdateOrg } from '../../features/organizations/hooks.js';
import { passwordRule } from '../../features/auth/schemas.js';
import { applyServerFieldErrors } from '../../lib/formErrors.js';

const ownerSchema = z.object({
  name: z.string().trim().min(2, 'validation.nameTooShort').max(120),
  email: z.string().trim().min(1, 'validation.required').email('validation.emailInvalid'),
  password: passwordRule,
});

/** Org admin account fields for a new organization (only when C2B registers it on someone's behalf). */
function OwnerCard({ form }) {
  const { t } = useTranslation('admin');
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <Card>
      <CardHeader title={t('orgs.editor.ownerTitle')} description={t('orgs.editor.ownerText')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input {...register('name')} label={t('account:account.name')} error={errors.name?.message} required autoComplete="off" />
        <Input {...register('email')} type="email" label={t('account:account.email')} error={errors.email?.message} required autoComplete="off" />
        <PasswordInput
          {...register('password')}
          label={t('account:admins.tempPassword')}
          hint={t('auth:fields.passwordHint')}
          error={errors.password?.message}
          autoComplete="new-password"
          required
          className="sm:col-span-2"
        />
      </div>
    </Card>
  );
}

/** /admin/organizations/new and /admin/organizations/:id/edit */
export default function OrganizationEditor() {
  const { id } = useParams();
  const isNew = !id;
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const query = useAdminOrg(id);
  const create = useAdminCreateOrg();
  const update = useAdminUpdateOrg();
  const ownerForm = useForm({ resolver: zodResolver(ownerSchema), defaultValues: { name: '', email: '', password: '' } });

  const onSubmit = async (payload, { setError }) => {
    if (isNew) {
      const ownerOk = await ownerForm.trigger();
      if (!ownerOk) return;
      create.mutate(
        { ...payload, owner: ownerForm.getValues() },
        {
          onSuccess: (data) => {
            toast.success(t('orgs.editor.created', { name: data.organization.name }));
            navigate(`/admin/organizations/${data.organization.id}`, { replace: true });
          },
          onError: (err) => {
            if (err?.response?.data?.code === 'EMAIL_IN_USE') {
              ownerForm.setError('email', { type: 'server', message: 'errors:EMAIL_IN_USE' }, { shouldFocus: true });
              return;
            }
            // owner.* field errors go to the owner card, the rest to the organization form.
            const ownerSetError = (path, e, o) => ownerForm.setError(path.replace(/^owner\./, ''), e, o);
            const routed = (path, e, o) => (path.startsWith('owner.') ? ownerSetError(path, e, o) : setError(path, e, o));
            if (!applyServerFieldErrors(err, routed)) toast.apiError(err);
          },
        },
      );
      return;
    }
    update.mutate(
      { id, body: payload },
      {
        onSuccess: (data) => {
          toast.success(t('orgs.editor.saved', { name: data.organization.name }));
          navigate(`/admin/organizations/${id}`);
        },
        onError: (err) => {
          if (!applyServerFieldErrors(err, setError)) toast.apiError(err);
        },
      },
    );
  };

  const back = isNew ? '/admin/organizations' : `/admin/organizations/${id}`;
  if (!isNew && query.isPending) return <PageSpinner />;
  if (!isNew && query.isError) {
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

  const organization = isNew ? undefined : query.data.organization;
  return (
    <div className="space-y-6">
      <Button as={Link} to={back} variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}>
        {t('actions.back', { ns: 'common' })}
      </Button>
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          {isNew ? t('orgs.editor.newTitle') : t('orgs.editor.editTitle', { name: organization.name })}
        </h1>
        <p className="mt-1 text-ink-muted">{isNew ? t('orgs.editor.newText') : t('orgs.editor.editText')}</p>
      </div>
      {isNew && <OwnerCard form={ownerForm} />}
      <OrganizationForm
        key={organization?.id ?? 'new'}
        organization={organization}
        onSubmit={onSubmit}
        submitting={create.isPending || update.isPending}
        submitLabel={isNew ? t('orgs.editor.create') : t('actions.save', { ns: 'common' })}
      />
    </div>
  );
}
