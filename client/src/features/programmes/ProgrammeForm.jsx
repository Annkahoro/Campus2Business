import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader, Input, Select, Spinner, TagInput, Tabs, Textarea } from '../../components/ui/index.js';
import DynamicField from '../../components/shared/DynamicField.jsx';
import { loc } from '../../lib/localized.js';
import { cn } from '../../lib/cn.js';
import { AUDIENCES, CATEGORIES, CONTENT_LANGS, DURATION_UNITS, LEVELS, MODES, PROGRAMME_STATUSES } from './constants.js';
import { categoryLabel } from './format.js';
import { useAdminProgrammes } from './hooks.js';

/* ─────────────── schema (messages are i18n keys) ─────────────── */

const optionalNumber = z
  .string()
  .trim()
  .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), 'fieldErrors.INVALID_NUMBER');

const i18nPair = z.object({ en: z.string(), es: z.string() });

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[A-Za-z0-9][A-Za-z0-9-]{1,29}$/.test(v), 'fieldErrors.INVALID_CODE'),
    status: z.enum(PROGRAMME_STATUSES),
    title: i18nPair,
    shortDescription: i18nPair,
    description: i18nPair,
    category: z.string().min(1, 'validation.required'),
    level: z.string().min(1, 'validation.required'),
    durationValue: optionalNumber,
    durationUnit: z.string(),
    deliveryMode: z.string(),
    language: z.array(z.string()).min(1, 'admin:programmeForm.errors.languageRequired'),
    prerequisites: z.array(z.string()),
    prerequisiteText: i18nPair,
    skillsGained: z.array(z.string()),
    targetAudience: z.array(z.string()).min(1, 'admin:programmeForm.errors.audienceRequired'),
    targetDepartments: z.array(z.string()),
    tags: z.array(z.string()),
    price: z.object({ amount: optionalNumber, currency: z.string().trim() }),
    intakes: z.array(
      z
        .object({
          startDate: z.string().min(1, 'validation.required'),
          endDate: z.string(),
          seats: optionalNumber,
          location: z.string(),
        })
        .refine((i) => !i.endDate || i.endDate >= i.startDate, { message: 'fieldErrors.END_BEFORE_START', path: ['endDate'] }),
    ),
    customFields: z.record(z.string(), z.any()),
  })
  .refine((v) => v.title.en.trim() || v.title.es.trim(), {
    message: 'admin:programmeForm.errors.titleRequired',
    path: ['title', 'en'],
  });

/* ─────────────── mapping ─────────────── */

const pair = (v) => ({ en: v?.en ?? '', es: v?.es ?? '' });
const dateOnly = (d) => (d ? String(d).slice(0, 10) : '');
const numStr = (n) => (n === null || n === undefined ? '' : String(n));

function toFormValues(p, fields) {
  const custom = {};
  for (const f of fields) {
    const v = p?.customFields?.[f.key];
    custom[f.key] = f.type === 'multiselect' ? (v ?? []) : f.type === 'boolean' ? !!v : (v ?? '');
  }
  return {
    code: p?.code ?? '',
    status: p?.status ?? 'draft',
    title: pair(p?.title),
    shortDescription: pair(p?.shortDescription),
    description: pair(p?.description),
    category: p?.category ?? '',
    level: p?.level ?? '',
    durationValue: numStr(p?.durationValue),
    durationUnit: p?.durationUnit ?? 'weeks',
    deliveryMode: p?.deliveryMode ?? '',
    language: p?.language?.length ? p.language : ['en', 'es'],
    prerequisites: (p?.prerequisites ?? []).map((x) => x.id),
    prerequisiteText: pair(p?.prerequisiteText),
    skillsGained: p?.skillsGained ?? [],
    targetAudience: p?.targetAudience?.length ? p.targetAudience : ['student', 'employee'],
    targetDepartments: p?.targetDepartments ?? [],
    tags: p?.tags ?? [],
    price: { amount: numStr(p?.price?.amount), currency: p?.price?.currency ?? 'EUR' },
    intakes: (p?.intakes ?? []).map((i) => ({
      startDate: dateOnly(i.startDate),
      endDate: dateOnly(i.endDate),
      seats: numStr(i.seats),
      location: i.location ?? '',
    })),
    customFields: custom,
  };
}

const toNum = (s) => (s === '' || s === undefined ? null : Number(s));

function toPayload(v) {
  const payload = {
    status: v.status,
    title: v.title,
    shortDescription: v.shortDescription,
    description: v.description,
    category: v.category,
    level: v.level,
    durationValue: toNum(v.durationValue),
    durationUnit: v.durationValue ? v.durationUnit || null : null,
    deliveryMode: v.deliveryMode || null,
    language: v.language,
    prerequisites: v.prerequisites,
    prerequisiteText: v.prerequisiteText,
    skillsGained: v.skillsGained,
    targetAudience: v.targetAudience,
    targetDepartments: v.targetDepartments,
    tags: v.tags,
    price: { amount: toNum(v.price.amount), currency: (v.price.currency || 'EUR').toUpperCase() },
    intakes: v.intakes.map((i) => ({
      startDate: i.startDate,
      endDate: i.endDate || null,
      seats: i.seats === '' ? null : Math.round(Number(i.seats)),
      location: i.location,
    })),
    customFields: v.customFields,
  };
  if (v.code) payload.code = v.code.toUpperCase();
  return payload;
}

/* ─────────────── small pieces ─────────────── */

function CheckboxGroup({ legend, options, value, onChange, error }) {
  const { t } = useTranslation();
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value.includes(o.value);
          return (
            <label
              key={o.value}
              className={cn(
                'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm focus-within:ring-2 focus-within:ring-emerald',
                checked ? 'border-emerald bg-mint-soft text-emerald-darker' : 'border-line bg-surface',
              )}
            >
              <input type="checkbox" className="accent-emerald" checked={checked} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(error)}
        </p>
      )}
    </fieldset>
  );
}

function PrerequisitePicker({ value, onChange, excludeId }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const [search, setSearch] = useState('');
  const query = useAdminProgrammes({ all: true });

  const items = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (query.data?.items ?? [])
      .filter((p) => p.id !== excludeId)
      .filter((p) => !s || `${p.code ?? ''} ${p.title.en} ${p.title.es}`.toLowerCase().includes(s));
  }, [query.data, search, excludeId]);

  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          label={t('admin:programmeForm.fields.prerequisites')}
          hint={t('admin:programmeForm.hints.prerequisites', { count: value.length })}
          placeholder={t('programme.filters.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputClassName="pl-10"
        />
        <Search size={18} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-[2.4rem] text-ink-muted" />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-line bg-surface">
        {query.isPending && (
          <div className="flex justify-center p-4 text-emerald">
            <Spinner />
          </div>
        )}
        {items.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 hover:bg-mint-soft">
            <input type="checkbox" className="accent-emerald" checked={value.includes(p.id)} onChange={() => toggle(p.id)} />
            <span className="flex-1 text-sm">
              {loc(p.title, lang)}
              {p.code && <span className="ml-2 text-xs text-ink-muted">{p.code}</span>}
            </span>
            <span className="text-xs text-ink-muted">{t(`programme.levels.${p.level}`)}</span>
          </label>
        ))}
        {query.data && items.length === 0 && <p className="p-4 text-sm text-ink-muted">{t('programme.noResults.title')}</p>}
      </div>
    </div>
  );
}

/* ─────────────── form ─────────────── */

/**
 * Admin programme form (docs/09). `fields` = active ProgrammeField definitions.
 * onSubmit(payload, { setError }) lets the page map server field errors back onto inputs.
 */
export default function ProgrammeForm({ programme, fields, onSubmit, submitting }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const [contentLang, setContentLang] = useState(lang === 'es' ? 'es' : 'en');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(programme, fields) });

  const intakes = useFieldArray({ control, name: 'intakes' });
  const title = watch('title');
  const category = watch('category');

  const categoryOptions = [...new Set([...CATEGORIES, ...(category ? [category] : [])])].map((c) => ({
    value: c,
    label: categoryLabel(t, c),
  }));

  const langTabs = CONTENT_LANGS.map((l) => ({
    value: l,
    label: t(`language.names.${l}`),
    badge: title?.[l]?.trim() ? null : <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-label={t('admin:programmeForm.missingTranslation')} />,
  }));

  // If the only errors are on the hidden language tab, switch to it so they are visible.
  const onInvalid = (errs) => {
    const langWithError = CONTENT_LANGS.find((l) =>
      ['title', 'shortDescription', 'description', 'prerequisiteText'].some((n) => errs?.[n]?.[l]),
    );
    if (langWithError) setContentLang(langWithError);
  };
  const submit = handleSubmit((values) => onSubmit(toPayload(values), { setError }), onInvalid);

  // Show EN/ES inputs for the active tab only, but keep both registered.
  const i18nInputs = (name, Component, props = {}) =>
    CONTENT_LANGS.map((l) => (
      <div key={l} hidden={contentLang !== l} lang={l}>
        <Component
          {...register(`${name}.${l}`)}
          {...props}
          label={`${props.label} (${l.toUpperCase()})`}
          error={errors?.[name]?.[l]?.message}
        />
      </div>
    ));

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {/* Basics */}
      <Card>
        <CardHeader
          title={t('admin:programmeForm.sections.basics')}
          action={<Tabs tabs={langTabs} value={contentLang} onChange={setContentLang} label={t('admin:programmeForm.contentLanguage')} size="sm" />}
        />
        <div className="space-y-4">
          {i18nInputs('title', Input, { label: t('admin:programmeForm.fields.title'), required: true })}
          {i18nInputs('shortDescription', Textarea, { label: t('admin:programmeForm.fields.shortDescription'), rows: 2 })}
          {i18nInputs('description', Textarea, { label: t('admin:programmeForm.fields.description'), rows: 7 })}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              {...register('code')}
              label={t('admin:programmeForm.fields.code')}
              hint={t('admin:programmeForm.hints.code')}
              placeholder="C2B-DT-101"
              error={errors.code?.message}
            />
            <Select
              {...register('status')}
              label={t('admin:programmeForm.fields.status')}
              placeholder={false}
              options={PROGRAMME_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
            />
          </div>
        </div>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader title={t('admin:programmeForm.sections.classification')} />
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select {...register('category')} label={t('admin:programmeForm.fields.category')} options={categoryOptions} error={errors.category?.message} required />
            <Select
              {...register('level')}
              label={t('admin:programmeForm.fields.level')}
              options={LEVELS.map((l) => ({ value: l, label: t(`programme.levels.${l}`) }))}
              error={errors.level?.message}
              required
            />
          </div>
          <Controller
            control={control}
            name="targetAudience"
            render={({ field }) => (
              <CheckboxGroup
                legend={t('admin:programmeForm.fields.audience')}
                options={AUDIENCES.map((a) => ({ value: a, label: t(`programme.audience.${a}`) }))}
                value={field.value}
                onChange={field.onChange}
                error={errors.targetAudience?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="targetDepartments"
            render={({ field }) => (
              <TagInput
                label={t('admin:programmeForm.fields.departments')}
                hint={t('admin:programmeForm.hints.departments')}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="tags"
            render={({ field }) => <TagInput label={t('admin:programmeForm.fields.tags')} value={field.value} onChange={field.onChange} />}
          />
        </div>
      </Card>

      {/* Logistics */}
      <Card>
        <CardHeader title={t('admin:programmeForm.sections.logistics')} />
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              {...register('durationValue')}
              type="number"
              min="0"
              step="any"
              label={t('admin:programmeForm.fields.duration')}
              error={errors.durationValue?.message}
            />
            <Select
              {...register('durationUnit')}
              label={t('admin:programmeForm.fields.durationUnit')}
              placeholder={false}
              options={DURATION_UNITS.map((u) => ({ value: u, label: t(`programme.units.${u}`) }))}
            />
            <Select
              {...register('deliveryMode')}
              label={t('admin:programmeForm.fields.mode')}
              options={MODES.map((m) => ({ value: m, label: t(`programme.modes.${m}`) }))}
            />
          </div>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <CheckboxGroup
                legend={t('admin:programmeForm.fields.languages')}
                options={CONTENT_LANGS.map((l) => ({ value: l, label: t(`language.names.${l}`) }))}
                value={field.value}
                onChange={field.onChange}
                error={errors.language?.message}
              />
            )}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              {...register('price.amount')}
              type="number"
              min="0"
              step="any"
              label={t('admin:programmeForm.fields.price')}
              hint={t('admin:programmeForm.hints.price')}
              error={errors.price?.amount?.message}
            />
            <Input {...register('price.currency')} label={t('admin:programmeForm.fields.currency')} maxLength={3} />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-ink">{t('admin:programmeForm.fields.intakes')}</legend>
            {intakes.fields.length === 0 && <p className="text-sm text-ink-muted">{t('programme.noIntakes')}</p>}
            {intakes.fields.map((item, index) => (
              <div key={item.id} className="grid gap-3 rounded-xl border border-line bg-cream p-4 sm:grid-cols-[1fr_1fr_110px_1fr_auto] sm:items-end">
                <Input
                  {...register(`intakes.${index}.startDate`)}
                  type="date"
                  label={t('admin:programmeForm.fields.startDate')}
                  error={errors.intakes?.[index]?.startDate?.message}
                  required
                />
                <Input
                  {...register(`intakes.${index}.endDate`)}
                  type="date"
                  label={t('admin:programmeForm.fields.endDate')}
                  error={errors.intakes?.[index]?.endDate?.message}
                />
                <Input
                  {...register(`intakes.${index}.seats`)}
                  type="number"
                  min="0"
                  label={t('admin:programmeForm.fields.seats')}
                  error={errors.intakes?.[index]?.seats?.message}
                />
                <Input {...register(`intakes.${index}.location`)} label={t('admin:programmeForm.fields.location')} />
                <Button
                  variant="ghost"
                  onClick={() => intakes.remove(index)}
                  aria-label={t('admin:programmeForm.removeIntake', { n: index + 1 })}
                  className="text-danger"
                >
                  <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => intakes.append({ startDate: '', endDate: '', seats: '', location: '' })}
              leftIcon={<Plus size={16} strokeWidth={1.75} aria-hidden="true" />}
            >
              {t('admin:programmeForm.addIntake')}
            </Button>
          </fieldset>
        </div>
      </Card>

      {/* Prerequisites */}
      <Card>
        <CardHeader title={t('admin:programmeForm.sections.prerequisites')} />
        <div className="space-y-4">
          <Controller
            control={control}
            name="prerequisites"
            render={({ field }) => <PrerequisitePicker value={field.value} onChange={field.onChange} excludeId={programme?.id} />}
          />
          {i18nInputs('prerequisiteText', Textarea, { label: t('admin:programmeForm.fields.prerequisiteText'), rows: 2 })}
        </div>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader title={t('admin:programmeForm.sections.skills')} />
        <Controller
          control={control}
          name="skillsGained"
          render={({ field }) => (
            <TagInput
              label={t('admin:programmeForm.fields.skillsGained')}
              hint={t('admin:programmeForm.hints.skills')}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Card>

      {/* Additional (custom) fields */}
      <Card>
        <CardHeader
          title={t('admin:programmeForm.sections.additional')}
          description={t('admin:programmeForm.hints.additional')}
          action={
            <Button as={Link} to="/admin/programme-fields" variant="ghost" size="sm">
              {t('admin:programmeForm.manageFields')}
            </Button>
          }
        />
        {fields.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('admin:programmeForm.noCustomFields')}</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === 'textarea' || f.type === 'multiselect' ? 'md:col-span-2' : undefined}>
                <Controller
                  control={control}
                  name={`customFields.${f.key}`}
                  render={({ field }) => (
                    <DynamicField
                      field={f}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.customFields?.[f.key]?.message}
                    />
                  )}
                />
                {!f.showToLearners && <p className="mt-1 text-xs text-ink-muted">{t('admin:fields.hiddenFromLearners')}</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-3 border-t border-line bg-cream px-4 py-4 md:-mx-8 md:px-8">
        <Button as={Link} to="/admin/programmes" variant="ghost">
          {t('actions.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {programme ? t('actions.save') : t('admin:programmeForm.create')}
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
