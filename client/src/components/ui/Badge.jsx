import { cn } from '../../lib/cn.js';

/** Solid soft colours only (docs/08 §5). */
const VARIANTS = {
  neutral: 'bg-cream-dark text-ink-muted',
  pending: 'bg-cream-dark text-warning',
  success: 'bg-mint text-emerald-darker',
  danger: 'bg-red-100 text-danger',
  active: 'bg-emerald text-white',
  info: 'bg-blue-100 text-info',
  soft: 'bg-mint-soft text-emerald-darker',
};

export default function Badge({ variant = 'neutral', icon, className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        VARIANTS[variant] ?? VARIANTS.neutral,
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
