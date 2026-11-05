import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Field, { controlClasses } from './Field.jsx';
import { cn } from '../../lib/cn.js';

/**
 * options: [{ value, label }] — labels must already be translated.
 * placeholder: pass `false` to hide the empty option, or a string to override the default.
 */
export default function Select({
  ref,
  id,
  label,
  hint,
  error,
  required,
  options = [],
  placeholder,
  className,
  inputClassName,
  children,
  ...props
}) {
  const { t } = useTranslation();
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required} className={className}>
      {({ describedBy }) => (
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            className={cn(controlClasses(!!error), 'appearance-none pr-10', inputClassName)}
            {...props}
          >
            {placeholder !== false && <option value="">{placeholder ?? t('selectPlaceholder')}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
        </div>
      )}
    </Field>
  );
}
