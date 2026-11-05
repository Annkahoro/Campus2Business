import { Check } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/**
 * Wizard stepper (docs/08): done = emerald circle with check, current = emerald ring, upcoming = line border.
 * steps: [{ key, label, done }]; current: key; onSelect(key) makes steps clickable.
 */
export default function Stepper({ steps, current, onSelect, label }) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-1 px-1">
        {steps.map((step, index) => {
          const isCurrent = step.key === current;
          return (
            <li key={step.key} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onSelect?.(step.key)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald',
                  isCurrent ? 'bg-mint-soft font-semibold text-emerald-darker' : 'text-ink-muted hover:bg-mint-soft hover:text-emerald',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    step.done
                      ? 'bg-emerald text-white'
                      : isCurrent
                        ? 'bg-surface text-emerald ring-2 ring-emerald'
                        : 'border border-line bg-surface text-ink-muted',
                  )}
                >
                  {step.done ? <Check size={14} strokeWidth={2.5} /> : index + 1}
                </span>
                <span className="whitespace-nowrap">{step.label}</span>
                {step.done && <span className="sr-only">✓</span>}
              </button>
              {index < steps.length - 1 && <span className="h-px w-4 bg-line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
