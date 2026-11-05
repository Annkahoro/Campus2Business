import { useId, useRef } from 'react';
import { cn } from '../../lib/cn.js';

/**
 * Accessible tabs (roving tabindex, arrow keys).
 * tabs: [{ value, label, badge? }]. Render panels yourself using `value`.
 */
export default function Tabs({ tabs, value, onChange, label, className, size = 'md' }) {
  const id = useId();
  const refs = useRef([]);

  const onKeyDown = (e, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={cn('inline-flex gap-1 rounded-xl bg-cream-dark p-1', className)}>
      {tabs.map((tab, index) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => (refs.current[index] = el)}
            id={`${id}-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
              active ? 'bg-surface text-emerald shadow-sm' : 'text-ink-muted hover:text-emerald',
            )}
          >
            {tab.label}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}
