import { cn } from '../../lib/cn.js';
import Spinner from './Spinner.jsx';

const VARIANTS = {
  primary: 'bg-emerald text-white hover:bg-emerald-dark active:bg-emerald-darker',
  secondary: 'bg-mint text-emerald-darker hover:bg-mint/80',
  outline: 'border border-emerald text-emerald bg-transparent hover:bg-mint-soft',
  ghost: 'text-emerald bg-transparent hover:bg-mint-soft',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/**
 * Button — variants: primary | secondary | outline | ghost | danger; sizes: sm | md | lg.
 * Pass `as={Link}` (or any component) to render a link styled as a button.
 */
export default function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  children,
  type,
  ...props
}) {
  const isButton = Component === 'button';
  return (
    <Component
      type={isButton ? (type ?? 'button') : type}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </Component>
  );
}
