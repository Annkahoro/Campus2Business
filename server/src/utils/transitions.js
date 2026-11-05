import { ApiError } from './ApiError.js';

/** Status machines (docs/07). Status changes happen only in services, through these maps. */
export const assertTransition = (map, from, to) => {
  if (!map[from]?.includes(to)) throw new ApiError(409, 'INVALID_STATUS_TRANSITION', `${from} → ${to}`);
};

export const canTransition = (map, from, to) => !!map[from]?.includes(to);

export const ORG = { pending: ['approved', 'rejected'], rejected: ['pending'], approved: ['suspended'], suspended: ['approved'] };

export const PROFILE = {
  draft: ['complete'],
  complete: ['draft', 'submitted'],
  submitted: ['under_review'],
  under_review: ['submitted', 'pathway_published'],
  pathway_published: ['complete', 'under_review'],
};

export const RECOMMENDATION = {
  generating: ['pending_review', 'failed'],
  pending_review: ['approved', 'rejected'],
  approved: ['published', 'pending_review'],
  failed: [],
  rejected: [],
  published: [],
};

export const ENROLLMENT = {
  requested: ['approved', 'rejected'],
  approved: ['payment_pending', 'active'],
  payment_pending: ['active', 'dropped'],
  active: ['completed', 'dropped'],
  completed: [],
  rejected: [],
  dropped: [],
};
