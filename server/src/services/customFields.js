import { ApiError } from '../utils/ApiError.js';

const isEmpty = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

const URL_RE = /^https?:\/\/[^\s]+$/i;

/** Returns the normalized value or throws a string error code. */
function coerce(field, raw) {
  switch (field.type) {
    case 'text':
    case 'textarea': {
      if (typeof raw !== 'string' && typeof raw !== 'number') throw 'INVALID_TEXT';
      const s = String(raw).trim();
      if (s.length > (field.type === 'text' ? 500 : 5000)) throw 'TOO_LONG';
      return s;
    }
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
      if (!Number.isFinite(n)) throw 'INVALID_NUMBER';
      return n;
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return raw;
      if (raw === 'true' || raw === 'false') return raw === 'true';
      throw 'INVALID_BOOLEAN';
    }
    case 'date': {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) throw 'INVALID_DATE';
      return d.toISOString().slice(0, 10); // stored as YYYY-MM-DD
    }
    case 'url': {
      const s = String(raw).trim();
      if (!URL_RE.test(s) || s.length > 2000) throw 'INVALID_URL';
      return s;
    }
    case 'select': {
      const allowed = field.options.map((o) => o.value);
      if (!allowed.includes(raw)) throw 'INVALID_OPTION';
      return raw;
    }
    case 'multiselect': {
      const allowed = field.options.map((o) => o.value);
      if (!Array.isArray(raw) || raw.some((v) => !allowed.includes(v))) throw 'INVALID_OPTION';
      return [...new Set(raw)];
    }
    default:
      throw 'UNKNOWN_TYPE';
  }
}

/**
 * Validates `input` custom field values against the active ProgrammeField definitions
 * and merges them over `existing` (a plain object).
 * - Unknown keys → error. Values of deactivated fields already on the programme are kept untouched.
 * - Empty values clear the field. Required active fields must have a value after the merge.
 * Throws VALIDATION_ERROR with `details: [{ path: 'customFields.<key>', message: <CODE> }]`.
 */
export function validateCustomFields(input = {}, existing = {}, activeFields = []) {
  const byKey = new Map(activeFields.map((f) => [f.key, f]));
  const result = { ...existing };
  const details = [];

  for (const [key, raw] of Object.entries(input)) {
    const field = byKey.get(key);
    if (!field) {
      if (!(key in existing)) details.push({ path: `customFields.${key}`, message: 'UNKNOWN_FIELD' });
      continue;
    }
    if (isEmpty(raw)) {
      delete result[key];
      continue;
    }
    try {
      result[key] = coerce(field, raw);
    } catch (code) {
      details.push({ path: `customFields.${key}`, message: typeof code === 'string' ? code : 'INVALID_VALUE' });
    }
  }

  for (const field of activeFields) {
    if (field.required && isEmpty(result[field.key])) {
      details.push({ path: `customFields.${field.key}`, message: 'REQUIRED' });
    }
  }

  if (details.length) throw ApiError.badRequest('VALIDATION_ERROR', 'Invalid custom field values', details);
  return result;
}
