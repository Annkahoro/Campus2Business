import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyServerFieldErrors } from '../../lib/formErrors.js';
import { useSaveStep } from './hooks.js';

/**
 * Wizard <-> step communication: the active step registers its `flush()` so the wizard can save
 * before navigating, and reports its save state for the indicator.
 */
const WizardContext = createContext(null);

export function WizardProvider({ disabled, children }) {
  const flushRef = useRef(null);
  const [saveState, setSaveState] = useState('idle');
  const registerFlush = useCallback((fn) => {
    flushRef.current = fn;
  }, []);
  const flush = useCallback(async () => (flushRef.current ? flushRef.current() : true), []);

  return (
    <WizardContext.Provider value={{ disabled, registerFlush, flush, saveState, setSaveState }}>
      {children}
    </WizardContext.Provider>
  );
}

export const useWizard = () => useContext(WizardContext);

const AUTOSAVE_DELAY = 1200;

/**
 * react-hook-form + autosave for one wizard step.
 * - Saves AUTOSAVE_DELAY ms after the last change (only if the form is valid and actually changed).
 * - `flush()` saves immediately (used by Next/Back/stepper); resolves to true on success.
 * - Saves are serialized so an older request never overwrites a newer one.
 */
export function useStepForm({ step, defaultValues, schema, toPayload }) {
  const { disabled, registerFlush, setSaveState } = useWizard();
  const save = useSaveStep();
  const form = useForm({ defaultValues, resolver: schema ? zodResolver(schema) : undefined, mode: 'onTouched' });

  const toPayloadRef = useRef(toPayload);
  toPayloadRef.current = toPayload;
  const lastSaved = useRef(JSON.stringify(toPayload(defaultValues)));
  const timer = useRef(null);
  const queue = useRef(Promise.resolve(true));
  const pending = useRef(false);

  const run = useCallback(() => {
    clearTimeout(timer.current);
    queue.current = queue.current.then(async () => {
      if (disabled) return true;
      pending.current = false;
      const valid = await form.trigger();
      if (!valid) {
        setSaveState('invalid');
        return false;
      }
      const payload = toPayloadRef.current(form.getValues());
      const json = JSON.stringify(payload);
      if (json === lastSaved.current) {
        setSaveState((s) => (s === 'pending' || s === 'invalid' ? 'saved' : s));
        return true;
      }
      setSaveState('saving');
      try {
        await save.mutateAsync({ step, body: payload });
        lastSaved.current = json;
        setSaveState('saved');
        return true;
      } catch (err) {
        applyServerFieldErrors(err, form.setError);
        setSaveState('error');
        return false;
      }
    });
    return queue.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, step]);

  useEffect(() => {
    registerFlush(run);
    setSaveState('idle');
    if (disabled) return undefined;
    const sub = form.watch(() => {
      pending.current = true;
      setSaveState('pending');
      clearTimeout(timer.current);
      timer.current = setTimeout(run, AUTOSAVE_DELAY);
    });
    return () => {
      sub.unsubscribe();
      clearTimeout(timer.current);
      if (pending.current) run(); // save pending edits when the step unmounts
      registerFlush(null);
    };
  }, [disabled, run, form, registerFlush, setSaveState]);

  return { form, disabled };
}
