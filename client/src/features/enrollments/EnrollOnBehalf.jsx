import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus } from 'lucide-react';
import { Button, toast } from '../../components/ui/index.js';
import ProgrammePicker from '../recommendations/ProgrammePicker.jsx';
import { OPEN_STATUSES } from './constants.js';
import { useRequestEnrollment } from './hooks.js';

/** Org admin: enroll an employee in any published programme (docs/09 "Enroll on behalf"). */
export default function EnrollOnBehalf({ employeeId, enrollments = [], disabled }) {
  const { t } = useTranslation('learning');
  const [open, setOpen] = useState(false);
  const request = useRequestEnrollment();
  const taken = enrollments.filter((e) => OPEN_STATUSES.includes(e.status) || e.status === 'completed').map((e) => e.programme.id);

  const pick = async (programme) => {
    try {
      await request.mutateAsync({ programmeId: programme.id, learnerId: employeeId });
      toast.success(t('request.sentOnBehalf'));
      setOpen(false);
    } catch (err) {
      toast.apiError(err);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled} loading={request.isPending} leftIcon={<CalendarPlus size={16} strokeWidth={1.75} aria-hidden="true" />}>
        {t('request.enrollOnBehalf')}
      </Button>
      <ProgrammePicker open={open} onClose={() => setOpen(false)} onPick={pick} excludeIds={taken} title={t('request.titleOnBehalf')} />
    </>
  );
}
