import { useId } from 'react';
import Field, { controlClasses } from './Field.jsx';
import { cn } from '../../lib/cn.js';

export default function Textarea({ ref, id, label, hint, error, required, rows = 4, className, inputClassName, ...props }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required} className={className}>
      {({ describedBy }) => (
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(controlClasses(!!error), 'resize-y', inputClassName)}
          {...props}
        />
      )}
    </Field>
  );
}
