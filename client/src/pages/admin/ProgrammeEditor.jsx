import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye } from 'lucide-react';
import { Button, Card, CardHeader, PageSpinner, toast } from '../../components/ui/index.js';
import ImageUpload from '../../components/shared/ImageUpload.jsx';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import ProgrammeForm from '../../features/programmes/ProgrammeForm.jsx';
import { coverFor } from '../../features/programmes/constants.js';
import {
  useCreateProgramme,
  useProgramme,
  useUpdateProgramme,
  useUploadProgrammeCover,
} from '../../features/programmes/hooks.js';
import { useRenderFields } from '../../features/programmeFields/hooks.js';
import { applyServerFieldErrors } from '../../lib/formErrors.js';
import { loc } from '../../lib/localized.js';
import QueryError from '../../components/shared/QueryError.jsx';

/** /admin/programmes/new and /admin/programmes/:id/edit */
export default function ProgrammeEditor() {
  const { id } = useParams();
  const isNew = !id;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const programmeQuery = useProgramme(id);
  const fieldsQuery = useRenderFields(); // admins receive every active field
  const create = useCreateProgramme();
  const updateMutation = useUpdateProgramme();
  const cover = useUploadProgrammeCover();

  if ((!isNew && programmeQuery.isPending) || fieldsQuery.isPending) return <PageSpinner />;
  if (!isNew && programmeQuery.isError) return <QueryError query={programmeQuery} />;
  if (fieldsQuery.isError) return <QueryError query={fieldsQuery} />;

  const programme = isNew ? null : programmeQuery.data?.programme;
  const fields = fieldsQuery.data ?? [];

  const onSubmit = (payload, { setError, clearDraft }) => {
    const handlers = {
      onError: (err) => {
        applyServerFieldErrors(err, setError);
        toast.apiError(err);
      },
    };
    if (isNew) {
      create.mutate(payload, {
        ...handlers,
        onSuccess: (data) => {
          clearDraft();
          toast.success(t('admin:programmes.created'));
          navigate(`/admin/programmes/${data.programme.id}/edit`, { replace: true });
        },
      });
    } else {
      updateMutation.mutate({ id, body: payload }, {
          ...handlers,
          onSuccess: () => {
            clearDraft();
            toast.success(t('admin:programmes.saved'));
          },
        });
    }
  };

  const onCover = (file) =>
    cover.mutate({ id, file }, { onSuccess: () => toast.success(t('admin:programmeForm.coverUploaded')), onError: toast.apiError });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button as={Link} to="/admin/programmes" variant="ghost" size="sm" leftIcon={<ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />}>
          {t('admin:programmes.title')}
        </Button>
        {!isNew && (
          <Button as={Link} to={`/admin/programmes/${id}`} variant="outline" size="sm" leftIcon={<Eye size={16} strokeWidth={1.75} aria-hidden="true" />}>
            {t('admin:programmes.view')}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          {isNew ? t('admin:programmes.new') : loc(programme?.title, i18n.resolvedLanguage)}
        </h1>
        {programme && <StatusBadge status={programme.status} />}
      </div>

      {!isNew && programme && (
        <Card>
          <CardHeader title={t('admin:programmeForm.sections.cover')} description={t('admin:programmeForm.hints.cover')} />
          <div className="max-w-xl">
            <ImageUpload
              imageUrl={programme.coverImage?.url}
              fallbackUrl={coverFor(programme)}
              onUpload={onCover}
              uploading={cover.isPending}
            />
          </div>
        </Card>
      )}
      {isNew && <p className="text-sm text-ink-muted">{t('admin:programmeForm.hints.coverAfterCreate')}</p>}

      <ProgrammeForm
        // Re-mount with fresh defaults for another programme or when field definitions change
        // (not on updatedAt, so a cover upload doesn't wipe unsaved edits).
        key={`${programme?.id ?? 'new'}-${fields.map((f) => f.key).join(',')}`}
        programme={programme}
        fields={fields}
        onSubmit={onSubmit}
        submitting={create.isPending || updateMutation.isPending}
      />
    </div>
  );
}
