import { useParams } from 'react-router-dom';
import ProgrammeDetailView from '../../features/programmes/ProgrammeDetailView.jsx';
import { useProgramme } from '../../features/programmes/hooks.js';
import { useMyEnrollments } from '../../features/enrollments/hooks.js';
import RequestEnrollmentButton from '../../features/enrollments/RequestEnrollmentButton.jsx';

/** /learner/programmes/:id — catalogue detail with "Request enrollment" (docs/09). */
export default function LearnerProgrammeDetail() {
  const { id } = useParams();
  const programme = useProgramme(id);
  const enrollments = useMyEnrollments();
  return (
    <ProgrammeDetailView
      id={id}
      backTo="/learner/programmes"
      prereqBasePath="/learner/programmes"
      actions={
        programme.data && (
          <RequestEnrollmentButton programme={programme.data} enrollments={enrollments.data ?? []} size="md" />
        )
      }
    />
  );
}
