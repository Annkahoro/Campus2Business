import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Stepper, toast } from '../../components/ui/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import OrganizationForm from '../../features/organizations/OrganizationForm.jsx';
import { useCreateOrg } from '../../features/organizations/hooks.js';
import { applyServerFieldErrors } from '../../lib/formErrors.js';

/** /org/setup — registration step 2: organization details → status pending. */
export default function OrgSetup() {
  const { t } = useTranslation('org');
  const { organization } = useAuth();
  const navigate = useNavigate();
  const create = useCreateOrg();

  if (organization) return <Navigate to="/org" replace />;

  const onSubmit = (payload, { setError }) =>
    create.mutate(payload, {
      onSuccess: () => {
        toast.success(t('setup.submitted'));
        navigate('/org', { replace: true });
      },
      onError: (err) => {
        applyServerFieldErrors(err, setError);
        toast.apiError(err);
      },
    });

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Stepper
          label={t('auth:registerOrg.stepsLabel')}
          current="organization"
          steps={[
            { key: 'account', label: t('auth:registerOrg.step1'), done: true },
            { key: 'organization', label: t('auth:registerOrg.step2'), done: false },
          ]}
        />
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('setup.title')}</h1>
        <p className="max-w-2xl text-ink-muted">{t('setup.subtitle')}</p>
      </div>
      <OrganizationForm onSubmit={onSubmit} submitting={create.isPending} submitLabel={t('setup.submit')} />
    </div>
  );
}
