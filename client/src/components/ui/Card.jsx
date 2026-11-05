import { cn } from '../../lib/cn.js';

export default function Card({ as: Component = 'div', padded = true, className, children, ...props }) {
  return (
    <Component
      className={cn(
        'bg-surface rounded-[var(--radius-card)] border border-line shadow-[var(--shadow-card)]',
        padded && 'p-6',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div>
        {title && <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>}
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
