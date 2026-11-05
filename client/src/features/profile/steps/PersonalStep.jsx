import { useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Input, Select, Textarea } from '../../../components/ui/index.js';
import { useStepForm } from '../WizardContext.jsx';
import { GENDERS, LANGUAGE_LEVELS, orNull, toDateInput } from '../constants.js';
import { AddButton, AvatarUpload, RepeatableItem, StepHeader } from './StepParts.jsx';

const schema = z.object({
  phone: z.string().max(30, 'fieldErrors.TOO_LONG'),
  dateOfBirth: z.string().refine((v) => !v || new Date(v) < new Date(), 'fieldErrors.DATE_IN_FUTURE'),
  gender: z.string(),
  country: z.string().max(80, 'fieldErrors.TOO_LONG'),
  city: z.string().max(80, 'fieldErrors.TOO_LONG'),
  languages: z.array(z.object({ name: z.string().trim().min(1, 'validation.required').max(60), level: z.string().min(1, 'validation.required') })),
  bio: z.string().max(1000, 'fieldErrors.TOO_LONG'),
});

const toForm = (p) => ({
  phone: p.phone ?? '',
  dateOfBirth: toDateInput(p.dateOfBirth),
  gender: p.gender ?? '',
  country: p.country ?? '',
  city: p.city ?? '',
  languages: (p.languages ?? []).map((l) => ({ name: l.name ?? '', level: l.level ?? '' })),
  bio: p.bio ?? '',
});

const toPayload = (v) => ({
  phone: v.phone.trim(),
  dateOfBirth: orNull(v.dateOfBirth),
  gender: orNull(v.gender),
  country: v.country.trim(),
  city: v.city.trim(),
  languages: v.languages.map((l) => ({ name: l.name.trim(), level: l.level })),
  bio: v.bio.trim(),
});

export default function PersonalStep({ profile }) {
  const { t } = useTranslation('profile');
  const { form, disabled } = useStepForm({ step: 'personal', defaultValues: toForm(profile.personal), schema, toPayload });
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const languages = useFieldArray({ control, name: 'languages' });
  const bioLength = watch('bio')?.length ?? 0;

  return (
    <fieldset disabled={disabled} className="space-y-6">
      <StepHeader title={t('steps.personal.title')} description={t('steps.personal.description')} />
      <AvatarUpload />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input {...register('country')} label={t('personal.country')} autoComplete="country-name" error={errors.country?.message} />
        <Input {...register('city')} label={t('personal.city')} autoComplete="address-level2" error={errors.city?.message} />
        <Input {...register('phone')} type="tel" label={t('personal.phone')} autoComplete="tel" error={errors.phone?.message} />
        <Input {...register('dateOfBirth')} type="date" label={t('personal.dateOfBirth')} error={errors.dateOfBirth?.message} />
        <Select
          {...register('gender')}
          label={t('personal.gender')}
          options={GENDERS.map((g) => ({ value: g, label: t(`personal.genders.${g}`) }))}
        />
      </div>
      <p className="text-xs text-ink-muted">{t('personal.privacyNote')}</p>

      <Textarea
        {...register('bio')}
        rows={4}
        label={t('personal.bio')}
        placeholder={t('personal.bioPlaceholder')}
        hint={t('personal.bioHint', { count: bioLength })}
        error={errors.bio?.message}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-ink">{t('personal.languages')}</legend>
        {languages.fields.map((item, index) => (
          <RepeatableItem
            key={item.id}
            title={t('personal.languageN', { n: index + 1 })}
            onRemove={() => languages.remove(index)}
            removeLabel={t('actions.removeItem', { n: index + 1 })}
            disabled={disabled}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                {...register(`languages.${index}.name`)}
                label={t('personal.languageName')}
                error={errors.languages?.[index]?.name?.message}
              />
              <Select
                {...register(`languages.${index}.level`)}
                label={t('personal.languageLevel')}
                options={LANGUAGE_LEVELS.map((l) => ({ value: l, label: t(`personal.levels.${l}`) }))}
                error={errors.languages?.[index]?.level?.message}
              />
            </div>
          </RepeatableItem>
        ))}
        <AddButton disabled={disabled} onClick={() => languages.append({ name: '', level: 'intermediate' })}>
          {t('personal.addLanguage')}
        </AddButton>
      </fieldset>
    </fieldset>
  );
}
