/**
 * Split layout for auth pages: form card on the left, photo on the right (hidden on mobile).
 * The photo sits on an offset solid mint block (docs/08 §8), solid colour only.
 */
export default function AuthShell({ title, subtitle, image, imageAlt, children, footer }) {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:px-8 lg:grid-cols-2 lg:items-center lg:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="font-display text-2xl font-bold md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 space-y-2 text-center text-sm text-ink-muted">{footer}</div>}
      </div>

      <div className="relative hidden lg:block">
        <div className="absolute -bottom-4 -right-4 h-full w-full rounded-2xl bg-mint" aria-hidden="true" />
        <img
          src={image}
          alt={imageAlt}
          className="relative aspect-[3/4] max-h-[640px] w-full rounded-2xl object-cover"
        />
      </div>
    </div>
  );
}
