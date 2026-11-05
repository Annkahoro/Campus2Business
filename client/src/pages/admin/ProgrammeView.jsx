import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Button } from '../../components/ui/index.js';
import ProgrammeDetailView from '../../features/programmes/ProgrammeDetailView.jsx';

/** Admin preview of a programme (any status), exactly as learners see it plus hidden custom fields. */
export default function ProgrammeView() {
  const { id } = useParams();
  const { t } = useTranslation();
  return (
    <ProgrammeDetailView
      id={id}
      backTo="/admin/programmes"
      prereqBasePath="/admin/programmes"
      actions={
        <Button as={Link} to={`/admin/programmes/${id}/edit`} size="sm" leftIcon={<Pencil size={16} strokeWidth={1.75} aria-hidden="true" />}>
          {t('actions.edit')}
        </Button>
      }
    />
  );
}
