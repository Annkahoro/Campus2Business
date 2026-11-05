import { Controller, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Input, TagInput } from '../../../components/ui/index.js';
import { useStepForm } from '../WizardContext.jsx';
import { toInt, toStr } from '../constants.js';
import { AddButton, RepeatableItem, StepHeader } from './StepParts.jsx';

const yearStr = z
  .string()
  .refine((v) => v === '' || (/^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= 2100), 'fieldErrors.INVALID_YEAR');

const schema = z.object({
  education: z.array(
    z
      .object({
        institution: z.string().trim().min(1, 'validation.required').max(150),
        qualification: z.string().max(100),
        fieldOfStudy: z.string().max(120),
        startYear: yearStr,
        endYear: yearStr,
        currentYearOfStudy: z.string().refine((v) => v === '' || (Number(v) >= 1 && Number(v) <= 10), 'fieldErrors.INVALID_NUMBER'),
        grade: z.string().max(40),
        keyCourses: z.array(z.string()),
      })
      .refine((e) => !e.startYear || !e.endYear || Number(e.endYear) >= Number(e.startYear), {
        message: 'fieldErrors.END_BEFORE_START',
        path: ['endYear'],
      }),
  ),
  certifications: z.array(
    z.object({
      name: z.string().trim().min(1, 'validation.required').max(150),
      issuer: z.string().max(120),
      year: yearStr,
      credentialUrl: z.string().refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'fieldErrors.INVALID_URL'),
    }),
  ),
});

const toForm = (d) => ({
  education: (d.education ?? []).map((e) => ({
    institution: e.institution ?? '',
    qualification: e.qualification ?? '',
    fieldOfStudy: e.fieldOfStudy ?? '',
    startYear: toStr(e.startYear),
    endYear: toStr(e.endYear),
    currentYearOfStudy: toStr(e.currentYearOfStudy),
    grade: e.grade ?? '',
    keyCourses: e.keyCourses ?? [],
  })),
  certifications: (d.certifications ?? []).map((c) => ({
    name: c.name ?? '',
    issuer: c.issuer ?? '',
    year: toStr(c.year),
    credentialUrl: c.credentialUrl ?? '',
  })),
});

const toPayload = (v) => ({
  education: v.education.map((e) => ({
    institution: e.institution.trim(),
    qualification: e.qualification.trim(),
    fieldOfStudy: e.fieldOfStudy.trim(),
    startYear: toInt(e.startYear),
    endYear: toInt(e.endYear),
    currentYearOfStudy: toInt(e.currentYearOfStudy),
    grade: e.grade.trim(),
    keyCourses: e.keyCourses,
  })),
  certifications: v.certifications.map((c) => ({
    name: c.name.trim(),
    issuer: c.issuer.trim(),
    year: toInt(c.year),
    credentialUrl: c.credentialUrl.trim(),
  })),
});

const emptyEducation = {
  institution: '',
  qualification: '',
  fieldOfStudy: '',
  startYear: '',
  endYear: '',
  currentYearOfStudy: '',
  grade: '',
  keyCourses: [],
};

export default function EducationStep({ profile }) {
  const { t } = useTranslation('profile');
  const isStudent = profile.learnerType === 'student';
  const { form, disabled } = useStepForm({ step: 'education', defaultValues: toForm(profile.education), schema, toPayload });
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const education = useFieldArray({ control, name: 'education' });
  const certs = useFieldArray({ control, name: 'certifications' });

  return (
    <fieldset disabled={disabled} className="space-y-8">
      <StepHeader title={t('steps.education.title')} description={t('steps.education.description')} />

      <section className="space-y-3" aria-labelledby="edu-heading">
        <h3 id="edu-heading" className="font-display text-base font-semibold">
          {t('education.studies')}
        </h3>
        {education.fields.length === 0 && <p className="text-sm text-ink-muted">{t('education.noStudies')}</p>}
        {education.fields.map((item, index) => {
          const err = errors.education?.[index];
          return (
            <RepeatableItem
              key={item.id}
              title={t('education.studyN', { n: index + 1 })}
              onRemove={() => education.remove(index)}
              removeLabel={t('actions.removeItem', { n: index + 1 })}
              disabled={disabled}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  {...register(`education.${index}.institution`)}
                  label={t('education.institution')}
                  error={err?.institution?.message}
                  required
                />
                <Input
                  {...register(`education.${index}.qualification`)}
                  label={t('education.qualification')}
                  placeholder={t('education.qualificationPlaceholder')}
                />
                <Input {...register(`education.${index}.fieldOfStudy`)} label={t('education.fieldOfStudy')} />
                <Input {...register(`education.${index}.grade`)} label={t('education.grade')} />
                <Input
                  {...register(`education.${index}.startYear`)}
                  inputMode="numeric"
                  label={t('education.startYear')}
                  placeholder="2023"
                  error={err?.startYear?.message}
                />
                <Input
                  {...register(`education.${index}.endYear`)}
                  inputMode="numeric"
                  label={t('education.endYear')}
                  hint={t('education.endYearHint')}
                  error={err?.endYear?.message}
                />
                {isStudent && (
                  <Input
                    {...register(`education.${index}.currentYearOfStudy`)}
                    type="number"
                    min="1"
                    max="10"
                    label={t('education.currentYear')}
                    error={err?.currentYearOfStudy?.message}
                  />
                )}
              </div>
              <Controller
                control={control}
                name={`education.${index}.keyCourses`}
                render={({ field }) => (
                  <TagInput label={t('education.keyCourses')} value={field.value} onChange={field.onChange} maxItems={30} />
                )}
              />
            </RepeatableItem>
          );
        })}
        <AddButton disabled={disabled} onClick={() => education.append(emptyEducation)}>
          {t('education.addStudy')}
        </AddButton>
      </section>

      <section className="space-y-3" aria-labelledby="cert-heading">
        <h3 id="cert-heading" className="font-display text-base font-semibold">
          {t('education.certifications')}
        </h3>
        {certs.fields.map((item, index) => {
          const err = errors.certifications?.[index];
          return (
            <RepeatableItem
              key={item.id}
              title={t('education.certN', { n: index + 1 })}
              onRemove={() => certs.remove(index)}
              removeLabel={t('actions.removeItem', { n: index + 1 })}
              disabled={disabled}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input {...register(`certifications.${index}.name`)} label={t('education.certName')} error={err?.name?.message} required />
                <Input {...register(`certifications.${index}.issuer`)} label={t('education.issuer')} />
                <Input
                  {...register(`certifications.${index}.year`)}
                  inputMode="numeric"
                  label={t('education.year')}
                  error={err?.year?.message}
                />
                <Input
                  {...register(`certifications.${index}.credentialUrl`)}
                  type="url"
                  placeholder="https://"
                  label={t('education.credentialUrl')}
                  error={err?.credentialUrl?.message}
                />
              </div>
            </RepeatableItem>
          );
        })}
        <AddButton disabled={disabled} onClick={() => certs.append({ name: '', issuer: '', year: '', credentialUrl: '' })}>
          {t('education.addCert')}
        </AddButton>
      </section>
    </fieldset>
  );
}
