import { Controller, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Alert, Input, Select, Switch, Textarea } from '../../../components/ui/index.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { useStepForm } from '../WizardContext.jsx';
import { toInt, toNum, toStr } from '../constants.js';
import { AddButton, RepeatableItem, StepHeader } from './StepParts.jsx';

const years = z.string().refine((v) => v === '' || (Number(v) >= 0 && Number(v) <= 60), 'fieldErrors.INVALID_NUMBER');
const yearStr = z
  .string()
  .refine((v) => v === '' || (/^\d{4}$/.test(v) && Number(v) >= 1950 && Number(v) <= 2100), 'fieldErrors.INVALID_YEAR');

const schema = z.object({
  employment: z.object({
    department: z.string().max(80),
    jobTitle: z.string().max(120),
    yearsInRole: years,
    totalYearsExperience: years,
    responsibilities: z.string().max(2000, 'fieldErrors.TOO_LONG'),
    managesPeople: z.boolean(),
  }),
  pastExperience: z.array(
    z
      .object({
        company: z.string().trim().min(1, 'validation.required').max(150),
        title: z.string().max(120),
        startYear: yearStr,
        endYear: yearStr,
        summary: z.string().max(1000, 'fieldErrors.TOO_LONG'),
      })
      .refine((e) => !e.startYear || !e.endYear || Number(e.endYear) >= Number(e.startYear), {
        message: 'fieldErrors.END_BEFORE_START',
        path: ['endYear'],
      }),
  ),
});

const toForm = (d) => {
  const e = d.employment ?? {};
  return {
    employment: {
      department: e.department ?? '',
      jobTitle: e.jobTitle ?? '',
      yearsInRole: toStr(e.yearsInRole),
      totalYearsExperience: toStr(e.totalYearsExperience),
      responsibilities: e.responsibilities ?? '',
      managesPeople: !!e.managesPeople,
    },
    pastExperience: (d.pastExperience ?? []).map((x) => ({
      company: x.company ?? '',
      title: x.title ?? '',
      startYear: toStr(x.startYear),
      endYear: toStr(x.endYear),
      summary: x.summary ?? '',
    })),
  };
};

const toPayload = (v) => ({
  employment: {
    department: v.employment.department.trim(),
    jobTitle: v.employment.jobTitle.trim(),
    yearsInRole: toNum(v.employment.yearsInRole),
    totalYearsExperience: toNum(v.employment.totalYearsExperience),
    responsibilities: v.employment.responsibilities.trim(),
    managesPeople: v.employment.managesPeople,
  },
  pastExperience: v.pastExperience.map((x) => ({
    company: x.company.trim(),
    title: x.title.trim(),
    startYear: toInt(x.startYear),
    endYear: toInt(x.endYear),
    summary: x.summary.trim(),
  })),
});

export default function EmploymentStep({ profile }) {
  const { t } = useTranslation('profile');
  const isEmployee = profile.learnerType === 'employee';
  const { form, disabled } = useStepForm({ step: 'employment', defaultValues: toForm(profile.employment), schema, toPayload });
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const past = useFieldArray({ control, name: 'pastExperience' });
  const e = errors.employment ?? {};

  // Employees choose from their organization's departments (validated again on the server).
  const { organization } = useAuth();
  const orgDepartments = organization?.departments ?? [];
  const current = profile.employment.employment?.department;
  const departmentOptions = [
    ...orgDepartments.map((d) => ({ value: d.name, label: d.name })),
    ...(current && !orgDepartments.some((d) => d.name === current) ? [{ value: current, label: current }] : []),
  ];

  return (
    <fieldset disabled={disabled} className="space-y-8">
      <StepHeader
        title={t('steps.employment.title')}
        description={isEmployee ? t('steps.employment.descriptionEmployee') : t('steps.employment.descriptionStudent')}
      />
      {!isEmployee && <Alert variant="info">{t('employment.optionalForStudents')}</Alert>}

      <section className="space-y-4" aria-labelledby="current-role">
        <h3 id="current-role" className="font-display text-base font-semibold">
          {isEmployee ? t('employment.currentRole') : t('employment.currentRoleStudent')}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {isEmployee && orgDepartments.length > 0 ? (
            <Select
              {...register('employment.department')}
              label={t('employment.department')}
              hint={t('employment.departmentSelectHint')}
              options={departmentOptions}
              error={e.department?.message}
              required
            />
          ) : (
            <Input {...register('employment.department')} label={t('employment.department')} error={e.department?.message} />
          )}
          <Input {...register('employment.jobTitle')} label={t('employment.jobTitle')} error={e.jobTitle?.message} required={isEmployee} />
          <Input
            {...register('employment.yearsInRole')}
            type="number"
            min="0"
            step="0.5"
            label={t('employment.yearsInRole')}
            error={e.yearsInRole?.message}
          />
          <Input
            {...register('employment.totalYearsExperience')}
            type="number"
            min="0"
            step="0.5"
            label={t('employment.totalYears')}
            error={e.totalYearsExperience?.message}
            required={isEmployee}
          />
        </div>
        <Textarea
          {...register('employment.responsibilities')}
          rows={4}
          label={t('employment.responsibilities')}
          placeholder={t('employment.responsibilitiesPlaceholder')}
          error={e.responsibilities?.message}
          required={isEmployee}
        />
        <Controller
          control={control}
          name="employment.managesPeople"
          render={({ field }) => (
            <Switch label={t('employment.managesPeople')} checked={field.value} onChange={field.onChange} disabled={disabled} />
          )}
        />
      </section>

      <section className="space-y-3" aria-labelledby="past-exp">
        <h3 id="past-exp" className="font-display text-base font-semibold">
          {t('employment.pastExperience')}
        </h3>
        {past.fields.map((item, index) => {
          const err = errors.pastExperience?.[index];
          return (
            <RepeatableItem
              key={item.id}
              title={t('employment.experienceN', { n: index + 1 })}
              onRemove={() => past.remove(index)}
              removeLabel={t('actions.removeItem', { n: index + 1 })}
              disabled={disabled}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input {...register(`pastExperience.${index}.company`)} label={t('employment.company')} error={err?.company?.message} required />
                <Input {...register(`pastExperience.${index}.title`)} label={t('employment.jobTitle')} />
                <Input
                  {...register(`pastExperience.${index}.startYear`)}
                  inputMode="numeric"
                  label={t('education.startYear')}
                  error={err?.startYear?.message}
                />
                <Input
                  {...register(`pastExperience.${index}.endYear`)}
                  inputMode="numeric"
                  label={t('education.endYear')}
                  error={err?.endYear?.message}
                />
              </div>
              <Textarea {...register(`pastExperience.${index}.summary`)} rows={2} label={t('employment.summary')} error={err?.summary?.message} />
            </RepeatableItem>
          );
        })}
        <AddButton
          disabled={disabled}
          onClick={() => past.append({ company: '', title: '', startYear: '', endYear: '', summary: '' })}
        >
          {t('employment.addExperience')}
        </AddButton>
      </section>
    </fieldset>
  );
}
