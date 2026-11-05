import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Input, Select, TagInput, Textarea } from '../../../components/ui/index.js';
import { useStepForm } from '../WizardContext.jsx';
import { BUDGET_RANGES, LEARNING_MODES, PREFERRED_LANGS, orNull, toDateInput, toNum, toStr } from '../constants.js';
import { StepHeader } from './StepParts.jsx';

const schema = z.object({
  careerGoals: z.object({
    shortTerm: z.string().max(1000, 'fieldErrors.TOO_LONG'),
    longTerm: z.string().max(1000, 'fieldErrors.TOO_LONG'),
    targetRoles: z.array(z.string()),
  }),
  interests: z.array(z.string()),
  hobbies: z.array(z.string()),
  learningPreferences: z.object({
    mode: z.string(),
    hoursPerWeek: z.string().refine((v) => v === '' || (Number(v) >= 0 && Number(v) <= 80), 'fieldErrors.INVALID_NUMBER'),
    preferredLanguage: z.string(),
    budgetRange: z.string(),
    preferredStart: z.string(),
  }),
});

const toForm = (g) => ({
  careerGoals: {
    shortTerm: g.careerGoals?.shortTerm ?? '',
    longTerm: g.careerGoals?.longTerm ?? '',
    targetRoles: g.careerGoals?.targetRoles ?? [],
  },
  interests: g.interests ?? [],
  hobbies: g.hobbies ?? [],
  learningPreferences: {
    mode: g.learningPreferences?.mode ?? 'any',
    hoursPerWeek: toStr(g.learningPreferences?.hoursPerWeek),
    preferredLanguage: g.learningPreferences?.preferredLanguage ?? 'any',
    budgetRange: g.learningPreferences?.budgetRange ?? '',
    preferredStart: toDateInput(g.learningPreferences?.preferredStart),
  },
});

const toPayload = (v) => ({
  careerGoals: {
    shortTerm: v.careerGoals.shortTerm.trim(),
    longTerm: v.careerGoals.longTerm.trim(),
    targetRoles: v.careerGoals.targetRoles,
  },
  interests: v.interests,
  hobbies: v.hobbies,
  learningPreferences: {
    mode: v.learningPreferences.mode || 'any',
    hoursPerWeek: toNum(v.learningPreferences.hoursPerWeek),
    preferredLanguage: v.learningPreferences.preferredLanguage || 'any',
    budgetRange: orNull(v.learningPreferences.budgetRange),
    preferredStart: orNull(v.learningPreferences.preferredStart),
  },
});

export default function GoalsStep({ profile }) {
  const { t } = useTranslation('profile');
  const { form, disabled } = useStepForm({ step: 'goals', defaultValues: toForm(profile.goals), schema, toPayload });
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const prefsErr = errors.learningPreferences ?? {};

  const tagField = (name, label, hint, placeholder) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TagInput label={label} hint={hint} placeholder={placeholder} value={field.value} onChange={field.onChange} />
      )}
    />
  );

  return (
    <fieldset disabled={disabled} className="space-y-8">
      <StepHeader title={t('steps.goals.title')} description={t('steps.goals.description')} />

      <section className="space-y-4" aria-labelledby="career-goals">
        <h3 id="career-goals" className="font-display text-base font-semibold">
          {t('goals.careerGoals')}
        </h3>
        <Textarea
          {...register('careerGoals.shortTerm')}
          rows={3}
          label={t('goals.shortTerm')}
          placeholder={t('goals.shortTermPlaceholder')}
          error={errors.careerGoals?.shortTerm?.message}
        />
        <Textarea
          {...register('careerGoals.longTerm')}
          rows={3}
          label={t('goals.longTerm')}
          placeholder={t('goals.longTermPlaceholder')}
          error={errors.careerGoals?.longTerm?.message}
        />
        {tagField('careerGoals.targetRoles', t('goals.targetRoles'), undefined, t('goals.targetRolesPlaceholder'))}
      </section>

      <section className="space-y-4" aria-labelledby="interests">
        <h3 id="interests" className="font-display text-base font-semibold">
          {t('goals.interestsTitle')}
        </h3>
        {tagField('interests', t('goals.interests'), t('goals.interestsHint'), t('goals.interestsPlaceholder'))}
        {tagField('hobbies', t('goals.hobbies'), undefined, t('goals.hobbiesPlaceholder'))}
      </section>

      <section className="space-y-4" aria-labelledby="prefs">
        <h3 id="prefs" className="font-display text-base font-semibold">
          {t('goals.preferences')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            {...register('learningPreferences.mode')}
            label={t('goals.mode')}
            placeholder={false}
            options={LEARNING_MODES.map((m) => ({ value: m, label: t(`goals.modes.${m}`) }))}
          />
          <Input
            {...register('learningPreferences.hoursPerWeek')}
            type="number"
            min="0"
            max="80"
            label={t('goals.hoursPerWeek')}
            error={prefsErr.hoursPerWeek?.message}
          />
          <Select
            {...register('learningPreferences.preferredLanguage')}
            label={t('goals.preferredLanguage')}
            placeholder={false}
            options={PREFERRED_LANGS.map((l) => ({ value: l, label: t(`goals.languages.${l}`) }))}
          />
          <Select
            {...register('learningPreferences.budgetRange')}
            label={t('goals.budget')}
            options={BUDGET_RANGES.map((b) => ({ value: b, label: t(`goals.budgets.${b}`) }))}
          />
          <Input {...register('learningPreferences.preferredStart')} type="date" label={t('goals.preferredStart')} />
        </div>
      </section>
    </fieldset>
  );
}
