import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Select, Switch, Textarea } from '../ui/index.js';
import { loc } from '../../lib/localized.js';
import { cn } from '../../lib/cn.js';

/**
 * Renders a ProgrammeField definition (docs/03 §5) as the right input.
 * Controlled: value + onChange(value). Values: text/textarea/url/date/select → string,
 * number → string (the server coerces), boolean → boolean, multiselect → string[].
 */
export default function DynamicField({ field, value, onChange, error, disabled }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const groupId = useId();

  const label = loc(field.label, lang) || field.key;
  const hint = loc(field.helpText, lang) || undefined;
  const common = { label, hint, error, required: field.required, disabled };
  const options = (field.options ?? []).map((o) => ({ value: o.value, label: loc(o.label, lang) || o.value }));

  switch (field.type) {
    case 'textarea':
      return <Textarea {...common} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return <Input {...common} type="number" inputMode="decimal" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'date':
      return <Input {...common} type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'url':
      return (
        <Input {...common} type="url" placeholder="https://" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      );
    case 'select':
      return <Select {...common} options={options} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'boolean':
      return (
        <div className="space-y-1.5">
          <Switch label={label} description={hint} checked={!!value} onChange={onChange} disabled={disabled} />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {t(error)}
            </p>
          )}
        </div>
      );
    case 'multiselect': {
      const selected = Array.isArray(value) ? value : [];
      const toggle = (v) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
      return (
        <fieldset className="space-y-2" aria-describedby={hint ? `${groupId}-hint` : undefined}>
          <legend className="text-sm font-medium text-ink">
            {label}
            {field.required && (
              <span className="ml-0.5 text-danger" aria-hidden="true">
                *
              </span>
            )}
          </legend>
          <div className="flex flex-wrap gap-2">
            {options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <label
                  key={o.value}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm',
                    'focus-within:ring-2 focus-within:ring-emerald',
                    checked ? 'border-emerald bg-mint-soft text-emerald-darker' : 'border-line bg-surface text-ink',
                  )}
                >
                  <input
                    type="checkbox"
                    className="accent-emerald"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(o.value)}
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
          {hint && !error && (
            <p id={`${groupId}-hint`} className="text-sm text-ink-muted">
              {hint}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {t(error)}
            </p>
          )}
        </fieldset>
      );
    }
    case 'text':
    default:
      return <Input {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

/** Read-only display of a stored custom field value (programme detail pages). */
export function formatFieldValue(field, value, { t, lang }) {
  if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) return null;
  const optionLabel = (v) => loc(field.options?.find((o) => o.value === v)?.label, lang) || v;
  switch (field.type) {
    case 'boolean':
      return value ? t('yes') : t('no');
    case 'select':
      return optionLabel(value);
    case 'multiselect':
      return value.map(optionLabel).join(', ');
    case 'date':
      return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(value));
    case 'number':
      return new Intl.NumberFormat(lang).format(Number(value));
    default:
      return String(value);
  }
}
