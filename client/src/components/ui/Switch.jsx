import { useId } from 'react';
import { cn } from '../../lib/cn.js';

/** Toggle switch (role="switch"). Controlled: checked + onChange(boolean). */
export default function Switch({ checked = false, onChange, label, description, disabled, className, id }) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const descId = description ? `${switchId}-desc` : undefined;

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <label htmlFor={switchId} className="text-sm font-medium text-ink">
          {label}
        </label>
        {description && (
          <p id={descId} className="text-sm text-ink-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descId}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          checked ? 'bg-emerald' : 'bg-line',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block h-5 w-5 rounded-full bg-surface shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
