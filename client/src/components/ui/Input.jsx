import { useId } from 'react';
import Field, { controlClasses } from './Field.jsx';
import { cn } from '../../lib/cn.js';

/** Works with react-hook-form: <Input {...register('email')} label=… error={errors.email?.message} /> */
export default function Input({ ref, id, label, hint, error, required, className, inputClassName, ...props }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required} className={className}>
      {({ describedBy }) => (
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(controlClasses(!!error), inputClassName)}
          {...props}
        />
      )}
    </Field>
  );
}
