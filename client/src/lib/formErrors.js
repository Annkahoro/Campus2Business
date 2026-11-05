/**
 * Maps a VALIDATION_ERROR response's `details` ([{ path, message: CODE }]) onto react-hook-form fields.
 * Messages become `fieldErrors.<CODE>` keys (common namespace); free-text Zod messages fall back to
 * fieldErrors.INVALID_VALUE. Returns true if any field error was set.
 */
export function applyServerFieldErrors(error, setError) {
  const details = error?.response?.data?.details;
  if (!Array.isArray(details) || !details.length) return false;
  let applied = false;
  for (const { path, message } of details) {
    if (!path) continue;
    const code = /^[A-Z][A-Z0-9_]+$/.test(message ?? '') ? message : 'INVALID_VALUE';
    setError(path, { type: 'server', message: `fieldErrors.${code}` }, { shouldFocus: !applied });
    applied = true;
  }
  return applied;
}
