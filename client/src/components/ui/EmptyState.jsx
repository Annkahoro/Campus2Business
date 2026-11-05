import { cn } from '../../lib/cn.js';

/**
 * illustration: an imported SVG/image URL (decorative, alt="") or a React node (e.g. a lucide icon).
 */
export default function EmptyState({ illustration, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {illustration &&
        (typeof illustration === 'string' ? (
          <img src={illustration} alt="" className="mb-6 h-40 w-auto" loading="lazy" />
        ) : (
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-mint-soft text-emerald">
            {illustration}
          </div>
        ))}
      {title && <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>}
      {description && <p className="mt-2 max-w-md text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
