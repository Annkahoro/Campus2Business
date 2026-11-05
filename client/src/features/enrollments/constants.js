export const ENROLLMENT_STATUSES = ['requested', 'payment_pending', 'active', 'completed', 'approved', 'rejected', 'dropped'];
export const OPEN_STATUSES = ['requested', 'approved', 'payment_pending', 'active'];
export const PAYMENT_METHODS = ['card', 'mpesa', 'bank', 'employer_invoice'];

/** Learner-facing groups on My Learning (docs/09). */
export const LEARNING_GROUPS = [
  { key: 'action', statuses: ['payment_pending'] },
  { key: 'active', statuses: ['active'] },
  { key: 'requested', statuses: ['requested', 'approved'] },
  { key: 'completed', statuses: ['completed'] },
  { key: 'closed', statuses: ['rejected', 'dropped'] },
];

/** Simulated processing delay before calling /pay (docs/07 §4). */
export const PAYMENT_DELAY_MS = 1500;
