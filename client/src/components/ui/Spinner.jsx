import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn.js';

const SIZES = { sm: 16, md: 20, lg: 24, xl: 40 };

export default function Spinner({ size = 'md', className, label }) {
  const { t } = useTranslation();
  return (
    <span role="status" className={cn('inline-flex items-center justify-center', className)}>
      <Loader2 size={SIZES[size] ?? SIZES.md} strokeWidth={1.75} className="animate-spin" aria-hidden="true" />
      <span className="sr-only">{label ?? t('loading')}</span>
    </span>
  );
}

/** Centered spinner for full sections / pages. */
export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-emerald">
      <Spinner size="xl" />
    </div>
  );
}
