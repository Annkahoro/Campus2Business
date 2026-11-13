import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Eye, GripVertical, Languages, Pencil, Plus, Save, Send, Trash2, XCircle } from 'lucide-react';
import { Alert, Badge, Button, Card, Input, Modal, Select, Tabs, Textarea, toast } from '../../components/ui/index.js';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import { getErrorCode } from '../../lib/axios.js';
import { loc } from '../../lib/localized.js';
import { cn } from '../../lib/cn.js';
import { PATHWAY_PHASES } from './constants.js';
import GenerateButton from './GenerateButton.jsx';
import PathwayOverview from './PathwayOverview.jsx';
import ProgrammePicker from './ProgrammePicker.jsx';
import {
  usePublishRecommendation,
  useRejectRecommendation,
  useTranslateRecommendation,
  useUpdateRecommendation,
} from './hooks.js';

const LANGS = ['en', 'es'];
const iconBtn =
  'rounded-lg p-2 text-ink-muted hover:bg-mint-soft hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald disabled:opacity-40';

let keySeq = 0;
const nextKey = () => `k${(keySeq += 1)}`;

/** Server DTO → editable state. */
function toState(rec) {
  return {
    summary: { ...rec.final.summary },
    adminNoteToLearner: { ...rec.final.adminNoteToLearner },
    internalNotes: rec.internalNotes ?? '',
    pathway: rec.final.pathway.map((s) => ({ key: nextKey(), ...s, reason: { ...s.reason }, expectedOutcome: { ...s.expectedOutcome } })),
    alternatives: rec.final.alternatives.map((a) => ({ key: nextKey(), ...a, reason: { ...a.reason } })),
  };
}

/** Editable state → PATCH body. */
function toBody(state) {
  return {
    final: {
      summary: state.summary,
      adminNoteToLearner: state.adminNoteToLearner,
      pathway: state.pathway.map((s) => ({
        programmeId: s.programme.id,
        phase: s.phase,
        reason: s.reason,
        matchScore: s.matchScore === '' || s.matchScore === null || s.matchScore === undefined ? null : Number(s.matchScore),
        expectedOutcome: s.expectedOutcome,
      })),
      alternatives: state.alternatives.map((a) => ({ programmeId: a.programme.id, reason: a.reason })),
    },
    internalNotes: state.internalNotes,
  };
}

const missing = (v) => !!(v?.en?.trim() || v?.es?.trim()) && !(v?.en?.trim() && v?.es?.trim());

/** Count bilingual fields that have only one language filled in. */
function countMissing(state) {
  let n = [state.summary, state.adminNoteToLearner].filter(missing).length;
  state.pathway.forEach((s) => (n += [s.reason, s.expectedOutcome].filter(missing).length));
  state.alternatives.forEach((a) => (n += missing(a.reason) ? 1 : 0));
  return n;
}

/** Shows a small "ES missing" badge next to a bilingual field. */
function LangHint({ value }) {
  const { t } = useTranslation('pathway');
  if (!missing(value)) return null;
  const lack = value.en?.trim() ? 'es' : 'en';
  return <Badge variant="pending">{t('editor.langMissing', { lang: lack.toUpperCase() })}</Badge>;
}

function StepCard({ step, index, lang, onChange, onRemove, disabled }) {
  const { t, i18n } = useTranslation('pathway');
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: step.key,
    disabled,
  });
  const title = loc(step.programme?.title, i18n.resolvedLanguage);
  const setText = (field) => (e) => onChange({ ...step, [field]: { ...step[field], [lang]: e.target.value } });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('rounded-xl border border-line bg-surface p-4', isDragging && 'relative z-10 shadow-lg ring-2 ring-emerald')}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={t('editor.dragHandle', { title })}
          className={`${iconBtn} mt-0.5 cursor-grab touch-none active:cursor-grabbing`}
        >
          <GripVertical size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <span className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald text-sm font-bold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{title}</p>
              {step.programme?.code && <p className="text-xs text-ink-muted">{step.programme.code}</p>}
            </div>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              aria-label={t('editor.removeStep', { title })}
              className={`${iconBtn} hover:text-danger`}
            >
              <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label={t('editor.phase')}
              value={step.phase}
              onChange={(e) => onChange({ ...step, phase: e.target.value })}
              options={PATHWAY_PHASES.map((p) => ({ value: p, label: t(`phases.${p}`) }))}
            />
            <Input
              label={t('editor.matchScore')}
              type="number"
              min="0"
              max="100"
              value={step.matchScore ?? ''}
              onChange={(e) => onChange({ ...step, matchScore: e.target.value === '' ? null : Math.max(0, Math.min(100, Number(e.target.value))) })}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-end">
              <LangHint value={step.reason} />
            </div>
            <Textarea label={`${t('editor.reason')} (${lang.toUpperCase()})`} rows={3} value={step.reason[lang] ?? ''} onChange={setText('reason')} maxLength={1500} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-end">
              <LangHint value={step.expectedOutcome} />
            </div>
            <Textarea
              label={`${t('expectedOutcome')} (${lang.toUpperCase()})`}
              rows={2}
              value={step.expectedOutcome[lang] ?? ''}
              onChange={setText('expectedOutcome')}
              maxLength={1500}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * The editable right column of /admin/recommendations/:id (docs/06 §9).
 * Mounted with key = recommendation.id. Actions use mutateAsync so their toasts survive the page switching
 * to the read-only view (a published/rejected draft unmounts this editor).
 */
export default function ReviewEditor({ data }) {
  const { t } = useTranslation('pathway');
  const rec = data.recommendation;
  const [state, setState] = useState(() => toState(rec));
  const [dirty, setDirty] = useState(false);
  const [lang, setLang] = useState('en');
  const [mode, setMode] = useState('edit');
  const [picker, setPicker] = useState(null); // 'step' | 'alternative'
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  const save = useUpdateRecommendation();
  const translate = useTranslateRecommendation();
  const publish = usePublishRecommendation();
  const reject = useRejectRecommendation();
  const busy = save.isPending || translate.isPending || publish.isPending || reject.isPending;

  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirtyRef.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const change = (updater) => {
    setState((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    setDirty(true);
  };
  const setI18n = (field) => (e) => change((s) => ({ ...s, [field]: { ...s[field], [lang]: e.target.value } }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    change((s) => {
      const from = s.pathway.findIndex((x) => x.key === active.id);
      const to = s.pathway.findIndex((x) => x.key === over.id);
      return { ...s, pathway: arrayMove(s.pathway, from, to) };
    });
  };

  const usedIds = useMemo(
    () => [...state.pathway.map((s) => s.programme.id), ...state.alternatives.map((a) => a.programme.id)],
    [state.pathway, state.alternatives],
  );
  const missingCount = countMissing(state);

  const onPick = (programme) => {
    const summary = {
      id: programme.id,
      code: programme.code,
      title: programme.title,
      catalogue: programme.catalogue,
      categories: programme.categories,
      subsidised: programme.subsidised,
      level: programme.level,
      durationValue: programme.durationValue,
      durationUnit: programme.durationUnit,
      deliveryMode: programme.deliveryMode,
      price: programme.price,
      prerequisites: (programme.prerequisites ?? []).map((p) => p.id),
    };
    if (picker === 'step') {
      change((s) => ({
        ...s,
        pathway: [
          ...s.pathway,
          { key: nextKey(), programme: summary, phase: 'core', matchScore: null, reason: { en: '', es: '' }, expectedOutcome: { en: '', es: '' } },
        ],
      }));
    } else {
      change((s) => ({ ...s, alternatives: [...s.alternatives, { key: nextKey(), programme: summary, reason: { en: '', es: '' } }] }));
    }
    setPicker(null);
  };

  /** Saves if needed; resolves when the server has the current state. */
  const persist = async () => {
    if (!dirty) return true;
    try {
      await save.mutateAsync({ id: rec.id, body: toBody(state) });
      setDirty(false);
      return true;
    } catch (err) {
      toast.apiError(err);
      if (getErrorCode(err) === 'VALIDATION_ERROR') toast.error(t('editor.invalidProgrammes'));
      return false;
    }
  };

  const onSave = async () => {
    if (await persist()) toast.success(t('editor.saved'));
  };

  const onTranslate = async () => {
    if (!(await persist())) return;
    try {
      const res = await translate.mutateAsync(rec.id);
      setState(toState(res.recommendation));
      setDirty(false);
      toast.success(t('editor.translated', { count: res.translated }));
    } catch (err) {
      toast.apiError(err);
    }
  };

  const onPublish = async () => {
    if (!(await persist())) return setConfirmPublish(false);
    try {
      await publish.mutateAsync(rec.id);
      toast.success(t('editor.published'));
    } catch (err) {
      toast.apiError(err);
      setConfirmPublish(false);
    }
  };

  const onReject = async () => {
    try {
      await reject.mutateAsync({ id: rec.id, reason: reason.trim() });
      toast.success(t('editor.rejected'));
    } catch (err) {
      toast.apiError(err);
    }
  };

  const preview = {
    summary: state.summary,
    strengths: rec.aiDraft.strengths,
    skillGaps: rec.aiDraft.skillGaps,
    pathway: state.pathway.map((s, i) => ({ ...s, order: i + 1 })),
    alternatives: state.alternatives,
    adminNoteToLearner: state.adminNoteToLearner,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label={t('editor.modeLabel')}
          value={mode}
          onChange={setMode}
          tabs={[
            { value: 'edit', label: <><Pencil size={14} aria-hidden="true" /> {t('editor.edit')}</> },
            { value: 'preview', label: <><Eye size={14} aria-hidden="true" /> {t('editor.preview')}</> },
          ]}
        />
        <Tabs
          label={t('editor.languageLabel')}
          value={lang}
          onChange={setLang}
          size="sm"
          tabs={LANGS.map((l) => ({ value: l, label: t(`language.names.${l}`, { ns: 'common' }) }))}
        />
      </div>

      {rec.liveWarnings.length > 0 && (
        <Alert variant="warning" title={t('editor.prereqTitle')}>
          <ul className="list-disc pl-5">
            {rec.liveWarnings.map((w, i) => {
              const step = state.pathway.find((s) => s.programme.id === w.programme);
              return (
                <li key={i}>
                  {t('editor.prereqMissing', { title: loc(step?.programme?.title, lang) || w.programme })}
                </li>
              );
            })}
          </ul>
          {dirty && <p className="mt-1 text-xs">{t('editor.prereqRecheck')}</p>}
        </Alert>
      )}

      {mode === 'preview' ? (
        <PathwayOverview pathway={preview} programmeHref={(id) => `/admin/programmes/${id}`} />
      ) : (
        <>
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{t('summaryTitle')}</h2>
              <LangHint value={state.summary} />
            </div>
            <Textarea
              label={`${t('editor.summary')} (${lang.toUpperCase()})`}
              rows={4}
              value={state.summary[lang] ?? ''}
              onChange={setI18n('summary')}
              maxLength={3000}
            />
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">{t('stepsTitle', { count: state.pathway.length })}</h2>
                <p className="text-sm text-ink-muted">{t('editor.reorderHint')}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPicker('step')}
                leftIcon={<Plus size={16} strokeWidth={1.75} aria-hidden="true" />}
              >
                {t('editor.addProgramme')}
              </Button>
            </div>
            {state.pathway.length === 0 && <Alert variant="warning">{t('editor.emptyPathway')}</Alert>}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={state.pathway.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-3">
                  {state.pathway.map((step, i) => (
                    <StepCard
                      key={step.key}
                      step={step}
                      index={i}
                      lang={lang}
                      disabled={busy}
                      onChange={(next) => change((s) => ({ ...s, pathway: s.pathway.map((x) => (x.key === step.key ? next : x)) }))}
                      onRemove={() => change((s) => ({ ...s, pathway: s.pathway.filter((x) => x.key !== step.key) }))}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">{t('alternatives')}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPicker('alternative')}
                disabled={state.alternatives.length >= 5}
                leftIcon={<Plus size={16} strokeWidth={1.75} aria-hidden="true" />}
              >
                {t('editor.addAlternative')}
              </Button>
            </div>
            {state.alternatives.length === 0 && <p className="text-sm text-ink-muted">{t('editor.noAlternatives')}</p>}
            <ul className="space-y-3">
              {state.alternatives.map((a) => {
                const title = loc(a.programme?.title, lang);
                return (
                  <li key={a.key} className="space-y-2 rounded-xl border border-line p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{title}</p>
                      <div className="flex items-center gap-2">
                        <LangHint value={a.reason} />
                        <button
                          type="button"
                          className={`${iconBtn} hover:text-danger`}
                          aria-label={t('editor.removeStep', { title })}
                          onClick={() => change((s) => ({ ...s, alternatives: s.alternatives.filter((x) => x.key !== a.key) }))}
                        >
                          <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <Textarea
                      label={`${t('editor.reason')} (${lang.toUpperCase()})`}
                      rows={2}
                      value={a.reason[lang] ?? ''}
                      maxLength={1500}
                      onChange={(e) =>
                        change((s) => ({
                          ...s,
                          alternatives: s.alternatives.map((x) => (x.key === a.key ? { ...x, reason: { ...x.reason, [lang]: e.target.value } } : x)),
                        }))
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">{t('editor.notes')}</h2>
              <LangHint value={state.adminNoteToLearner} />
            </div>
            <Textarea
              label={`${t('editor.noteToLearner')} (${lang.toUpperCase()})`}
              hint={t('editor.noteToLearnerHint')}
              rows={3}
              value={state.adminNoteToLearner[lang] ?? ''}
              onChange={setI18n('adminNoteToLearner')}
              maxLength={2000}
            />
            <Textarea
              label={t('editor.internalNotes')}
              hint={t('editor.internalNotesHint')}
              rows={3}
              value={state.internalNotes}
              onChange={(e) => change((s) => ({ ...s, internalNotes: e.target.value }))}
              maxLength={5000}
            />
          </Card>
        </>
      )}

      {/* Action bar */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-cream px-4 py-3 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {dirty ? t('editor.unsaved') : t('editor.allSaved')}
            {missingCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-warning">
                <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
                {t('editor.missingCount', { count: missingCount })}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={onSave} loading={save.isPending && !publish.isPending && !translate.isPending} disabled={!dirty || busy} leftIcon={<Save size={18} strokeWidth={1.75} aria-hidden="true" />}>
              {t('editor.saveDraft')}
            </Button>
            <Button variant="outline" onClick={onTranslate} loading={translate.isPending} disabled={busy || missingCount === 0} leftIcon={<Languages size={18} strokeWidth={1.75} aria-hidden="true" />}>
              {t('editor.translateMissing')}
            </Button>
            <GenerateButton learnerId={data.learner.user.id} regenerate variant="outline" />
            <Button variant="ghost" className="text-danger" onClick={() => setRejectOpen(true)} disabled={busy} leftIcon={<XCircle size={18} strokeWidth={1.75} aria-hidden="true" />}>
              {t('editor.reject')}
            </Button>
            <Button onClick={() => setConfirmPublish(true)} disabled={busy || state.pathway.length === 0} leftIcon={<Send size={18} strokeWidth={1.75} aria-hidden="true" />}>
              {t('editor.approvePublish')}
            </Button>
          </div>
        </div>
      </div>

      <ProgrammePicker
        open={!!picker}
        onClose={() => setPicker(null)}
        onPick={onPick}
        excludeIds={usedIds}
        title={picker === 'alternative' ? t('editor.addAlternative') : t('editor.addProgramme')}
      />

      <ConfirmDialog
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        onConfirm={onPublish}
        loading={save.isPending || publish.isPending}
        variant="primary"
        title={t('editor.publishTitle')}
        description={missingCount > 0 ? `${t('editor.publishText', { name: data.learner.user.name })} ${t('editor.publishMissing', { count: missingCount })}` : t('editor.publishText', { name: data.learner.user.name })}
        confirmLabel={t('editor.approvePublish')}
      />

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title={t('editor.rejectTitle')}
        description={t('editor.rejectText')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={reject.isPending}>
              {t('actions.cancel')}
            </Button>
            <Button variant="danger" onClick={onReject} loading={reject.isPending} disabled={reason.trim().length < 3}>
              {t('editor.reject')}
            </Button>
          </>
        }
      >
        <Textarea label={t('editor.rejectReason')} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} required />
      </Modal>
    </div>
  );
}
