import { Controller, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Input, Select } from '../../../components/ui/index.js';
import { useStepForm } from '../WizardContext.jsx';
import { SKILL_CATEGORIES } from '../constants.js';
import { AddButton, LevelPicker, RepeatableItem, StepHeader } from './StepParts.jsx';

const schema = z.object({
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'validation.required').max(80),
        category: z.string().min(1, 'validation.required'),
        level: z.number().int().min(1).max(5),
      }),
    )
    .superRefine((skills, ctx) => {
      const seen = new Map();
      skills.forEach((s, i) => {
        const key = s.name.trim().toLowerCase();
        if (key && seen.has(key)) ctx.addIssue({ code: 'custom', message: 'fieldErrors.DUPLICATE_SKILL', path: [i, 'name'] });
        seen.set(key, i);
      });
    }),
});

const toPayload = (v) => ({ skills: v.skills.map((s) => ({ name: s.name.trim(), category: s.category, level: s.level })) });

export default function SkillsStep({ profile }) {
  const { t } = useTranslation('profile');
  const { form, disabled } = useStepForm({
    step: 'skills',
    defaultValues: { skills: (profile.skills.skills ?? []).map(({ name, category, level }) => ({ name, category, level })) },
    schema,
    toPayload,
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const skills = useFieldArray({ control, name: 'skills' });

  return (
    <fieldset disabled={disabled} className="space-y-6">
      <StepHeader title={t('steps.skills.title')} description={t('steps.skills.description')} />
      <p className="text-sm text-ink-muted">{t('skills.scale')}</p>

      <div className="grid gap-3 lg:grid-cols-2">
        {skills.fields.map((item, index) => {
          const err = errors.skills?.[index];
          return (
            <RepeatableItem
              key={item.id}
              title={t('skills.skillN', { n: index + 1 })}
              onRemove={() => skills.remove(index)}
              removeLabel={t('actions.removeItem', { n: index + 1 })}
              disabled={disabled}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  {...register(`skills.${index}.name`)}
                  label={t('skills.name')}
                  placeholder={t('skills.namePlaceholder')}
                  error={err?.name?.message}
                  required
                />
                <Select
                  {...register(`skills.${index}.category`)}
                  label={t('skills.category')}
                  placeholder={false}
                  options={SKILL_CATEGORIES.map((c) => ({ value: c, label: t(`skills.categories.${c}`) }))}
                  error={err?.category?.message}
                />
              </div>
              <Controller
                control={control}
                name={`skills.${index}.level`}
                render={({ field }) => (
                  <LevelPicker
                    name={`skill-level-${item.id}`}
                    label={t('skills.level')}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={disabled}
                  />
                )}
              />
            </RepeatableItem>
          );
        })}
      </div>

      {skills.fields.length < 3 && <p className="text-sm text-warning">{t('skills.minHint')}</p>}

      <AddButton disabled={disabled} onClick={() => skills.append({ name: '', category: 'technical', level: 3 })}>
        {t('skills.add')}
      </AddButton>
    </fieldset>
  );
}
