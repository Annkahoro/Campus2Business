import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const VARIANTS = {
  info: { box: 'bg-mint-soft border-emerald/30 text-emerald-darker', Icon: Info },
  success: { box: 'bg-mint-soft border-success/30 text-emerald-darker', Icon: CheckCircle2 },
  warning: { box: 'bg-cream-dark border-warning/30 text-warning', Icon: TriangleAlert },
  danger: { box: 'bg-red-50 border-danger/30 text-danger', Icon: AlertCircle },
};

export default function Alert({ variant = 'info', title, children, className }) {
  const { box, Icon } = VARIANTS[variant] ?? VARIANTS.info;
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', box, className)}
    >
      <Icon size={20} strokeWidth={1.75} className="mt-px shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}
