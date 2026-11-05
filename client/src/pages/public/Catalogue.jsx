import { useTranslation } from 'react-i18next';
import ProgrammeCatalogue from '../../features/programmes/ProgrammeCatalogue.jsx';

/** Public catalogue preview: /programmes */
export default function Catalogue() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 md:px-8">
      <div className="max-w-3xl">
        <h1 className="font-display text-3xl font-bold md:text-4xl">{t('programme.catalogueTitle')}</h1>
        <p className="mt-2 text-lg text-ink-muted">{t('programme.catalogueSubtitle')}</p>
      </div>
      <ProgrammeCatalogue basePath="/programmes" />
    </div>
  );
}
