import { useTranslation } from 'react-i18next';

export default function OrDivider() {
  const { t } = useTranslation('auth');
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-ink-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      {t('or')}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
