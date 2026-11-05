import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, Input, Select, TagInput, Textarea } from '../../components/ui/index.js';
import { cn } from '../../lib/cn.js';
import { ORG_SIZES, TRAINING_BUDGETS } from './constants.js';

const schema = z.object({
  name: z.string().trim().min(2, 'validation.nameTooShort').max(150),
  industry: z.string().max(100),
  size: z.string(),
  country: z.string().max(80),
  city: z.string().max(80),
  website: z.string().refine((v) => !v || /^https?:\/\/\S+$/i.test(v), 'fieldErrors.INVALID_URL'),
  description: z.string().max(2000, 'fieldErrors.TOO_LONG'),
  contactPerson: z.object({
    name: z.string().max(120),
    email: z.string().refine((v) => !v || z.email().safeParse(v).success, 'validation.emailInvalid'),
    phone: z.string().max(30),
    position: z.string().max(120),
  }),
  departments: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'validation.required').max(80),
        headcount: z.string().refine((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0), 'fieldErrors.INVALID_NUMBER'),
      }),
    )
    .min(1, 'org:form.errors.departmentsRequired')
    .superRefine((deps, ctx) => {
      const seen = new Set();
      deps.forEach((d, i) => {
        const key = d.name.trim().toLowerCase();
        if (key && seen.has(key)) ctx.addIssue({ code: 'custom', message: 'fieldErrors.DUPLICATE_DEPARTMENT', path: [i, 'name'] });
        seen.add(key);
      });
    }),
  goals: z.array(z.string()),
  objectives: z.array(z.string()),
  skillGaps: z.array(z.string()),
  trainingBudget: z.string(),
  digitalMaturity: z.number().int().min(1).max(5).nullable(),
  additionalInfo: z.string().max(2000, 'fieldErrors.TOO_LONG'),
});

const toForm = (o) => ({
  name: o?.name ?? '',
  industry: o?.industry ?? '',
  size: o?.size ?? '',
  country: o?.country ?? '',
  city: o?.city ?? '',
  website: o?.website ?? '',
  description: o?.description ?? '',
  contactPerson: { name: '', email: '', phone: '', position: '', ...(o?.contactPerson ?? {}) },
  departments: o?.departments?.length
    ? o.departments.map((d) => ({ name: d.name, headcount: d.headcount === null || d.headcount === undefined ? '' : String(d.headcount) }))
    : [{ name: '', headcount: '' }],
  goals: o?.goals ?? [],
  objectives: o?.objectives ?? [],
  skillGaps: o?.skillGaps ?? [],
  trainingBudget: o?.trainingBudget ?? 'undisclosed',
  digitalMaturity: o?.digitalMaturity ?? null,
  additionalInfo: o?.additionalInfo ?? '',
});

const toPayload = (v) => ({
  name: v.name.trim(),
  industry: v.industry.trim(),
  size: v.size || null,
  country: v.country.trim(),
  city: v.city.trim(),
  website: v.website.trim(),
  description: v.description.trim(),
  contactPerson: {
    name: v.contactPerson.name.trim(),
    email: v.contactPerson.email.trim(),
    phone: v.contactPerson.phone.trim(),
    position: v.contactPerson.position.trim(),
  },
  departments: v.departments.map((d) => ({ name: d.name.trim(), headcount: d.headcount === '' ? null : Number(d.headcount) })),
  goals: v.goals,
  objectives: v.objectives,
  skillGaps: v.skillGaps,
  trainingBudget: v.trainingBudget,
  digitalMaturity: v.digitalMaturity,
  additionalInfo: v.additionalInfo.trim(),
});

/** 1–5 self-assessed digital maturity as a segmented control. */
function MaturityPicker({ value, onChange }) {
  const { t } = useTranslation('org');
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{t('form.digitalMaturity')}</legend>
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className={cn(
              'cursor-pointer rounded-lg border px-3.5 py-1.5 text-sm font-semibold focus-within:ring-2 focus-within:ring-emerald',
              value === n ? 'border-emerald bg-emerald text-white' : 'border-line bg-surface text-ink-muted hover:border-emerald',
            )}
          >
            <input type="radio" name="digitalMaturity" className="sr-only" checked={value === n} onChange={() => onChange(n)} />
            {n}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-muted">{value ? t(`form.maturity.${value}`) : t('form.maturityHint')}</p>
    </fieldset>
  );
}

/**
 * Organization details form (docs/09 register-organization step 2, and /org/organization).
 * onSubmit(payload, { setError }).
 */
export default function OrganizationForm({ organization, onSubmit, submitting, submitLabel }) {
  const { t } = useTranslation('org');
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toForm(organization) });
  const departments = useFieldArray({ control, name: 'departments' });

  const tags = (name, label, hint) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <TagInput label={label} hint={hint} value={field.value} onChange={field.onChange} />}
    />
  );

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(toPayload(v), { setError }))} noValidate className="space-y-6">
      <Card>
        <CardHeader title={t('form.sections.details')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input {...register('name')} label={t('form.name')} error={errors.name?.message} required className="sm:col-span-2" />
          <Input {...register('industry')} label={t('form.industry')} placeholder={t('form.industryPlaceholder')} />
          <Select
            {...register('size')}
            label={t('form.size')}
            options={ORG_SIZES.map((s) => ({ value: s, label: t('form.sizeOption', { size: s }) }))}
          />
          <Input {...register('country')} label={t('form.country')} />
          <Input {...register('city')} label={t('form.city')} />
          <Input {...register('website')} type="url" placeholder="https://" label={t('form.website')} error={errors.website?.message} className="sm:col-span-2" />
          <Textarea {...register('description')} rows={3} label={t('form.description')} error={errors.description?.message} className="sm:col-span-2" />
        </div>
      </Card>

      <Card>
        <CardHeader title={t('form.sections.contact')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input {...register('contactPerson.name')} label={t('form.contactName')} />
          <Input {...register('contactPerson.position')} label={t('form.contactPosition')} />
          <Input {...register('contactPerson.email')} type="email" label={t('form.contactEmail')} error={errors.contactPerson?.email?.message} />
          <Input {...register('contactPerson.phone')} type="tel" label={t('form.contactPhone')} />
        </div>
      </Card>

      <Card>
        <CardHeader title={t('form.sections.departments')} description={t('form.departmentsHint')} />
        <div className="space-y-3">
          {departments.fields.map((item, index) => (
            <div key={item.id} className="grid items-end gap-3 sm:grid-cols-[1fr_160px_auto]">
              <Input
                {...register(`departments.${index}.name`)}
                label={t('form.departmentName')}
                placeholder={t('form.departmentPlaceholder')}
                error={errors.departments?.[index]?.name?.message}
                required
              />
              <Input
                {...register(`departments.${index}.headcount`)}
                type="number"
                min="0"
                label={t('form.headcount')}
                error={errors.departments?.[index]?.headcount?.message}
              />
              <Button
                variant="ghost"
                className="text-danger"
                disabled={departments.fields.length === 1}
                onClick={() => departments.remove(index)}
                aria-label={t('actions.removeItem', { n: index + 1 })}
              >
                <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </div>
          ))}
          {(errors.departments?.message || errors.departments?.root?.message) && (
            <p role="alert" className="text-sm text-danger">
              {t(errors.departments.message ?? errors.departments.root.message)}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => departments.append({ name: '', headcount: '' })}
            leftIcon={<Plus size={16} strokeWidth={1.75} aria-hidden="true" />}
          >
            {t('form.addDepartment')}
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title={t('form.sections.training')} description={t('form.trainingHint')} />
        <div className="space-y-5">
          {tags('goals', t('form.goals'), t('form.goalsHint'))}
          {tags('objectives', t('form.objectives'), t('form.objectivesHint'))}
          {tags('skillGaps', t('form.skillGaps'), t('form.skillGapsHint'))}
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              {...register('trainingBudget')}
              label={t('form.trainingBudget')}
              placeholder={false}
              options={TRAINING_BUDGETS.map((b) => ({ value: b, label: t(`form.budgets.${b}`) }))}
            />
            <Controller
              control={control}
              name="digitalMaturity"
              render={({ field }) => <MaturityPicker value={field.value} onChange={field.onChange} />}
            />
          </div>
          <Textarea {...register('additionalInfo')} rows={3} label={t('form.additionalInfo')} error={errors.additionalInfo?.message} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-right text-sm text-danger">
          {t('errors:VALIDATION_ERROR')}
        </p>
      )}
    </form>
  );
}
