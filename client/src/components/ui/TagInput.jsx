import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Field from './Field.jsx';
import { cn } from '../../lib/cn.js';

/**
 * Chips input for skills, tags, goals… Enter or comma adds; Backspace on empty input removes the last chip.
 * Controlled: value (string[]) + onChange(string[]).
 */
export default function TagInput({
  value = [],
  onChange,
  label,
  hint,
  error,
  required,
  placeholder,
  maxItems = 50,
  maxLength = 100,
  className,
  id,
}) {
  const { t } = useTranslation();
  const autoId = useId();
  const inputId = id ?? autoId;
  const [draft, setDraft] = useState('');

  const add = (raw) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim().slice(0, maxLength))
      .filter(Boolean);
    if (!parts.length) return;
    const lower = new Set(value.map((v) => v.toLowerCase()));
    const next = [...value];
    for (const p of parts) {
      if (next.length >= maxItems) break;
      if (!lower.has(p.toLowerCase())) {
        next.push(p);
        lower.add(p.toLowerCase());
      }
    }
    onChange(next);
    setDraft('');
  };

  const remove = (index) => onChange(value.filter((_, i) => i !== index));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value.length - 1);
    }
  };

  return (
    <Field id={inputId} label={label} hint={hint ?? t('tagInput.hint')} error={error} required={required} className={className}>
      {({ describedBy }) => (
        <div
          className={cn(
            'flex min-h-11 flex-wrap items-center gap-2 rounded-xl border bg-surface px-3 py-2',
            'focus-within:ring-2 focus-within:ring-mint',
            error ? 'border-danger' : 'border-line focus-within:border-emerald',
          )}
        >
          {value.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1 rounded-full bg-mint-soft py-0.5 pl-2.5 pr-1 text-sm text-emerald-darker"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={t('tagInput.remove', { tag })}
                className="rounded-full p-0.5 hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
              >
                <X size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </span>
          ))}
          <input
            id={inputId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => draft && add(draft)}
            placeholder={value.length ? '' : (placeholder ?? t('tagInput.placeholder'))}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className="min-w-32 flex-1 bg-transparent py-1 text-base text-ink placeholder:text-ink-muted/70 focus:outline-none"
          />
        </div>
      )}
    </Field>
  );
}
