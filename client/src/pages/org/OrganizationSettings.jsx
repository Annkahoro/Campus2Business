import { useTranslation } from 'react-i18next';
import { Card, CardHeader, toast } from '../../components/ui/index.js';
import ImageUpload from '../../components/shared/ImageUpload.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import OrganizationForm from '../../features/organizations/OrganizationForm.jsx';
import OrgStatusNotice from '../../features/organizations/OrgStatusNotice.jsx';
import { useUpdateMyOrg, useUploadOrgLogo } from '../../features/organizations/hooks.js';
import { applyServerFieldErrors } from '../../lib/formErrors.js';

/** /org/organization — edit details; saving a rejected organization resubmits it (→ pending). */
export default function OrganizationSettings() {
  const { t } = useTranslation('org');
  const { organization } = useAuth();
  const update = useUpdateMyOrg();
  const logo = useUploadOrgLogo();
  const rejected = organization.status === 'rejected';

  const onSubmit = (payload, { setError }) =>
    update.mutate(payload, {
      onSuccess: () => toast.success(rejected ? t('settings.resubmitted') : t('settings.saved')),
      onError: (err) => {
        applyServerFieldErrors(err, setError);
        toast.apiError(err);
      },
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('settings.title')}</h1>
        <p className="mt-1 text-ink-muted">{t('settings.subtitle')}</p>
      </div>

      <OrgStatusNotice organization={organization} compact />

      <Card>
        <CardHeader title={t('settings.logo')} description={t('settings.logoHint')} />
        <div className="w-40">
          <ImageUpload
            imageUrl={organization.logo?.url}
            onUpload={(file) => logo.mutate(file, { onSuccess: () => toast.success(t('settings.logoUpdated')), onError: toast.apiError })}
            uploading={logo.isPending}
            aspectClass="aspect-square"
            fit="object-contain bg-surface p-2"
          />
        </div>
      </Card>

      <OrganizationForm
        key={organization.id}
        organization={organization}
        onSubmit={onSubmit}
        submitting={update.isPending}
        submitLabel={rejected ? t('settings.saveResubmit') : t('actions.save')}
      />
    </div>
  );
}
