import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn.js';

/** Shared control styles for Input / Select / Textarea (docs/08 §5). */
export const controlClasses = (hasError) =>
  cn(
    'w-full bg-surface border rounded-xl px-4 py-2.5 text-base text-ink placeholder:text-ink-muted/70',
    'transition-colors focus:outline-none focus:ring-2 focus:ring-mint',
    'disabled:cursor-not-allowed disabled:bg-cream-dark/50',
    hasError ? 'border-danger focus:border-danger' : 'border-line focus:border-emerald',
  );

/**
 * Wraps a form control with label, hint and error message.
 * `error` may be a translation key (Zod messages are keys) or plain text.
 */
export default function Field({ id, label, hint, error, required, className, children }) {
  const { t } = useTranslation();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children({ describedBy: [hintId, errorId].filter(Boolean).join(' ') || undefined })}
      {hint && !error && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
    </div>
  );
}
