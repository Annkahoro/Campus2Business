import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from './Button.jsx';

export default function Pagination({ page, pages, onChange }) {
  const { t } = useTranslation();
  if (!pages || pages <= 1) return null;
  return (
    <nav aria-label={t('pagination.label')} className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        leftIcon={<ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />}
      >
        {t('pagination.previous')}
      </Button>
      <span className="text-sm text-ink-muted" aria-live="polite">
        {t('pagination.pageOf', { page, pages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        rightIcon={<ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />}
      >
        {t('pagination.next')}
      </Button>
    </nav>
  );
}
