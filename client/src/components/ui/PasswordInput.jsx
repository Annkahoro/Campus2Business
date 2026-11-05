import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Field, { controlClasses } from './Field.jsx';
import { cn } from '../../lib/cn.js';

/** Password input with a show/hide toggle. Works with react-hook-form's register(). */
export default function PasswordInput({ ref, id, label, hint, error, required, className, ...props }) {
  const { t } = useTranslation('auth');
  const [visible, setVisible] = useState(false);
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required} className={className}>
      {({ describedBy }) => (
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            className={cn(controlClasses(!!error), 'pr-12')}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t('password.hide') : t('password.show')}
            aria-pressed={visible}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
          >
            {visible ? (
              <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Eye size={18} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </Field>
  );
}
