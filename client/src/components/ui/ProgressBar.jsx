import { cn } from '../../lib/cn.js';

/** Solid fill progress bar (docs/08): track cream-dark, fill emerald. */
/** `ariaLabel` names the bar for screen readers when no visible `label` is shown. */
export default function ProgressBar({ value = 0, label, ariaLabel, showValue = true, className, size = 'md' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="font-medium text-ink">{label}</span>}
          {showValue && <span className="font-semibold text-emerald">{pct}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? ariaLabel}
        className={cn('w-full overflow-hidden rounded-full bg-cream-dark', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div className="h-full rounded-full bg-emerald transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
