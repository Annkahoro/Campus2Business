import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CloudOff, Loader2, Lock } from 'lucide-react';
import { Alert, Button, Card, ProgressBar, Stepper } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import { WizardProvider, useWizard } from './WizardContext.jsx';
import { WIZARD_STEPS } from './constants.js';
import PersonalStep from './steps/PersonalStep.jsx';
import EducationStep from './steps/EducationStep.jsx';
import EmploymentStep from './steps/EmploymentStep.jsx';
import SkillsStep from './steps/SkillsStep.jsx';
import GoalsStep from './steps/GoalsStep.jsx';
import CvStep from './steps/CvStep.jsx';
import ReviewStep from './steps/ReviewStep.jsx';

const STEP_COMPONENTS = {
  personal: PersonalStep,
  education: EducationStep,
  employment: EmploymentStep,
  skills: SkillsStep,
  goals: GoalsStep,
  cv: CvStep,
  review: ReviewStep,
};

function SaveIndicator() {
  const { t } = useTranslation('profile');
  const { saveState } = useWizard();
  const map = {
    pending: { icon: null, text: t('save.pending'), cls: 'text-ink-muted' },
    saving: { icon: <Loader2 size={14} className="animate-spin" aria-hidden="true" />, text: t('save.saving'), cls: 'text-ink-muted' },
    saved: { icon: <Check size={14} aria-hidden="true" />, text: t('save.saved'), cls: 'text-success' },
    invalid: { icon: <AlertCircle size={14} aria-hidden="true" />, text: t('save.invalid'), cls: 'text-warning' },
    error: { icon: <CloudOff size={14} aria-hidden="true" />, text: t('save.error'), cls: 'text-danger' },
  };
  const s = map[saveState];
  return (
    <span className={`inline-flex min-h-5 items-center gap-1.5 text-sm ${s?.cls ?? ''}`} aria-live="polite">
      {s?.icon}
      {s?.text}
    </span>
  );
}

function WizardBody({ profile }) {
  const { t } = useTranslation('profile');
  const { flush } = useWizard();
  const [params, setParams] = useSearchParams();
  const current = WIZARD_STEPS.includes(params.get('step')) ? params.get('step') : 'personal';
  const index = WIZARD_STEPS.indexOf(current);
  const topRef = useRef(null);
  const firstRender = useRef(true);

  /** Save the current step first; stay on it if it is invalid or the save failed (errors are shown). */
  const goTo = async (step) => {
    if (step === current) return;
    if (!(await flush())) return;
    const next = new URLSearchParams(params);
    next.set('step', step);
    setParams(next);
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [current]);

  const StepComponent = STEP_COMPONENTS[current];
  const steps = WIZARD_STEPS.map((key) => ({
    key,
    label: t(`steps.${key}.short`),
    done: key === 'review' ? ['submitted', 'under_review', 'pathway_published'].includes(profile.status) : (profile.sections?.[key] ?? 0) >= 1,
  }));

  return (
    <div className="space-y-6" ref={topRef}>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold md:text-3xl">{t('title')}</h1>
            <StatusBadge status={profile.status} />
          </div>
          <SaveIndicator />
        </div>
        <ProgressBar value={profile.completionPercent} label={t('completion')} />
        <Stepper steps={steps} current={current} onSelect={goTo} label={t('stepsLabel')} />
      </Card>

      {profile.isLocked && (
        <Alert variant="info" title={t('locked.title')}>
          <span className="inline-flex items-center gap-1.5">
            <Lock size={14} strokeWidth={1.75} aria-hidden="true" />
            {t('locked.text')}
          </span>
        </Alert>
      )}
      {profile.status === 'pathway_published' && <Alert variant="info">{t('locked.publishedText')}</Alert>}

      <Card>
        {/* key: each step mounts its own form with fresh defaults */}
        <StepComponent key={current} profile={profile} goTo={goTo} />
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          disabled={index === 0}
          onClick={() => goTo(WIZARD_STEPS[index - 1])}
          leftIcon={<ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />}
        >
          {t('actions.back')}
        </Button>
        {index < WIZARD_STEPS.length - 1 && (
          <Button onClick={() => goTo(WIZARD_STEPS[index + 1])} rightIcon={<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />}>
            {profile.isLocked ? t('actions.next') : t('saveAndContinue')}
          </Button>
        )}
      </div>
    </div>
  );
}

/** 6-step learner profile wizard with autosave, review screen and submit (docs/09). */
export default function ProfileWizard({ profile }) {
  return (
    <WizardProvider disabled={profile.isLocked}>
      <WizardBody profile={profile} />
    </WizardProvider>
  );
}
