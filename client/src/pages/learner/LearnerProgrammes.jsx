import { useTranslation } from 'react-i18next';
import ProgrammeCatalogue from '../../features/programmes/ProgrammeCatalogue.jsx';

/** /learner/programmes */
export default function LearnerProgrammes() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('programme.catalogueTitle')}</h1>
        <p className="mt-1 text-ink-muted">{t('programme.catalogueSubtitle')}</p>
      </div>
      <ProgrammeCatalogue basePath="/learner/programmes" />
    </div>
  );
}
