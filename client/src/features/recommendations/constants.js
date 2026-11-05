export const PATHWAY_PHASES = ['foundation', 'core', 'advanced', 'specialisation'];
export const QUEUE_TABS = ['pending_review', 'generating', 'approved', 'published', 'failed', 'rejected'];
export const GAP_IMPORTANCE = ['high', 'medium', 'low'];

/** Solid, flat phase colours (docs/08). Classes are full strings so Tailwind keeps them. */
export const PHASE_STYLES = {
  foundation: { dot: 'bg-mint text-emerald-darker', badge: 'bg-mint-soft text-emerald-darker' },
  core: { dot: 'bg-emerald text-white', badge: 'bg-mint text-emerald-darker' },
  advanced: { dot: 'bg-emerald-dark text-white', badge: 'bg-emerald text-white' },
  specialisation: { dot: 'bg-ink text-white', badge: 'bg-cream-dark text-ink' },
};

export const IMPORTANCE_VARIANT = { high: 'danger', medium: 'pending', low: 'neutral' };

/** Profile statuses from which C2B can generate a pathway (server: GENERATABLE). */
export const GENERATABLE_PROFILE_STATUSES = ['submitted', 'under_review', 'pathway_published'];
