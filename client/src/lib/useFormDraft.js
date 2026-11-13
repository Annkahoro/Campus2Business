import { useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'c2b:draft:';
const VERSION = 1;

const storage = {
  read(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.v === VERSION && parsed.values ? parsed : null;
    } catch {
      return null;
    }
  },
  write(key, entry) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ v: VERSION, ...entry }));
      return true;
    } catch {
      return false; // storage full / blocked — the form still works, it just isn't saved
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* storage unavailable */
    }
  },
};

/** Deep merge for restoring: keeps keys the draft doesn't know about (e.g. a custom field added since). */
function mergeDraft(defaults, draft) {
  if (Array.isArray(defaults) || Array.isArray(draft)) return draft ?? defaults;
  if (defaults && typeof defaults === 'object' && draft && typeof draft === 'object') {
    const out = { ...defaults };
    for (const k of Object.keys(draft)) if (k in defaults) out[k] = mergeDraft(defaults[k], draft[k]);
    return out;
  }
  return draft === undefined ? defaults : draft;
}

/**
 * Saves a react-hook-form's values to this browser while the user types and restores them when the form is
 * opened again — so leaving the page (to manage custom fields or categories, a refresh, a closed tab) never
 * loses work. The draft is removed once the form is saved (`clear()`) or discarded.
 *
 * - `key`: unique per form instance, e.g. `programme:new` or `programme:<id>`
 * - `version`: the record's `updatedAt`; a draft made against an older version is flagged as `stale`
 *
 * Returns `{ restoredAt, stale, savedAt, discard, clear }`.
 */
export function useFormDraft({ key, form, defaultValues, version = null, delay = 600 }) {
  const { watch, reset, getValues } = form;
  const [restored, setRestored] = useState(null); // { savedAt, stale }
  const [savedAt, setSavedAt] = useState(null);
  const defaultsJson = useRef(JSON.stringify(defaultValues));
  const timer = useRef(null);
  const paused = useRef(false);

  // Restore once on mount.
  useEffect(() => {
    const draft = storage.read(key);
    if (!draft) return;
    const values = mergeDraft(defaultValues, draft.values);
    if (JSON.stringify(values) === defaultsJson.current) {
      storage.remove(key);
      return;
    }
    paused.current = true;
    reset(values, { keepDefaultValues: true }); // still "dirty" compared to the saved record
    paused.current = false;
    setRestored({ savedAt: draft.savedAt, stale: !!(version && draft.version && draft.version !== version) });
    setSavedAt(draft.savedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [key]);

  const persist = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    const values = getValues();
    if (JSON.stringify(values) === defaultsJson.current) {
      storage.remove(key);
      setSavedAt(null);
      return;
    }
    const at = new Date().toISOString();
    if (storage.write(key, { savedAt: at, version, values })) setSavedAt(at);
  }, [getValues, key, version]);

  // Save shortly after every change; flush immediately when leaving the page or unmounting.
  useEffect(() => {
    const sub = watch(() => {
      if (paused.current) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(persist, delay);
    });
    const flush = () => persist(); // removes the draft instead when nothing differs from the saved record
    window.addEventListener('pagehide', flush);
    return () => {
      sub.unsubscribe();
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [watch, persist, delay]);

  /** Call after a successful save: forget the draft and treat the current values as saved. */
  const clear = useCallback(
    (savedValues) => {
      clearTimeout(timer.current);
      timer.current = null;
      storage.remove(key);
      const values = savedValues ?? getValues();
      defaultsJson.current = JSON.stringify(values);
      paused.current = true;
      reset(values);
      paused.current = false;
      setRestored(null);
      setSavedAt(null);
    },
    [getValues, key, reset],
  );

  /** Throw the draft away and go back to the saved record. */
  const discard = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = null;
    storage.remove(key);
    paused.current = true;
    reset(JSON.parse(defaultsJson.current));
    paused.current = false;
    setRestored(null);
    setSavedAt(null);
  }, [key, reset]);

  return { restoredAt: restored?.savedAt ?? null, stale: restored?.stale ?? false, savedAt, discard, clear };
}

export default useFormDraft;
