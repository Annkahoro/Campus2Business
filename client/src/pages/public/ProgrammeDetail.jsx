import { useParams } from 'react-router-dom';
import ProgrammeDetailView from '../../features/programmes/ProgrammeDetailView.jsx';

/** Public programme page: /programmes/:id */
export default function ProgrammeDetail() {
  const { id } = useParams();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <ProgrammeDetailView id={id} backTo="/programmes" prereqBasePath="/programmes" />
    </div>
  );
}
