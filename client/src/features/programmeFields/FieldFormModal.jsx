import { useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select, Switch, Tabs, toast } from '../../components/ui/index.js';
import DynamicField from '../../components/shared/DynamicField.jsx';
import { applyServerFieldErrors } from '../../lib/formErrors.js';
import { getErrorCode } from '../../lib/axios.js';
import { useCreateField, useUpdateField } from './hooks.js';

export const FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'multiselect', 'boolean', 'date', 'url'];
const needsOptions = (type) => type === 'select' || type === 'multiselect';

const schema = z
  .object({
    key: z.string().trim().regex(/^[a-z][a-zA-Z0-9_]{1,49}$/, 'admin:fields.errors.key'),
    type: z.enum(FIELD_TYPES),
    label: z.object({ en: z.string().trim(), es: z.string().trim() }),
    helpText: z.object({ en: z.string().trim(), es: z.string().trim() }),
    options: z.array(
      z.object({
        value: z.string().trim().min(1, 'validation.required'),
        label: z.object({ en: z.string().trim(), es: z.string().trim() }),
      }),
    ),
    required: z.boolean(),
    showToLearners: z.boolean(),
    useInAI: z.boolean(),
  })
  .refine((v) => v.label.en || v.label.es, { message: 'admin:fields.errors.label', path: ['label', 'en'] })
  .refine((v) => !needsOptions(v.type) || v.options.length > 0, { message: 'admin:fields.errors.options', path: ['options'] })
  .refine((v) => new Set(v.options.map((o) => o.value)).size === v.options.length, {
    message: 'admin:fields.errors.duplicateOption',
    path: ['options'],
  });

/** "Certification body" → "certificationBody" */
const toKey = (label) =>
  label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('')
    .replace(/^[^a-z]+/, '')
    .slice(0, 50);

const emptyPair = { en: '', es: '' };

function defaults(field) {
  return {
    key: field?.key ?? '',
    type: field?.type ?? 'text',
    label: { ...emptyPair, ...field?.label },
    helpText: { ...emptyPair, ...field?.helpText },
    options: (field?.options ?? []).map((o) => ({ value: o.value, label: { ...emptyPair, ...o.label } })),
    required: field?.required ?? false,
    showToLearners: field?.showToLearners ?? true,
    useInAI: field?.useInAI ?? true,
  };
}

/** Create / edit a custom programme field. `key` and `type` are locked after creation. */
export default function FieldFormModal({ open, onClose, field }) {
  const { t } = useTranslation();
  const isEdit = !!field;
  const [lang, setLang] = useState('en');
  const [keyTouched, setKeyTouched] = useState(isEdit);
  const [previewValue, setPreviewValue] = useState(undefined);
  const create = useCreateField();
  const update = useUpdateField();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: defaults(field) });
  const options = useFieldArray({ control, name: 'options' });
  const values = watch();

  const labelReg = register('label.en', {
    onChange: (e) => !keyTouched && setValue('key', toKey(e.target.value), { shouldValidate: false }),
  });

  const onSubmit = handleSubmit((v) => {
    const body = {
      label: v.label,
      helpText: v.helpText,
      options: needsOptions(v.type) ? v.options : [],
      required: v.required,
      showToLearners: v.showToLearners,
      useInAI: v.useInAI,
    };
    const handlers = {
      onSuccess: () => {
        toast.success(isEdit ? t('admin:fields.updated') : t('admin:fields.created'));
        onClose();
      },
      onError: (err) => {
        if (getErrorCode(err) === 'FIELD_KEY_EXISTS') setError('key', { message: 'errors:FIELD_KEY_EXISTS' });
        else applyServerFieldErrors(err, setError);
        toast.apiError(err);
      },
    };
    if (isEdit) update.mutate({ id: field.id, body }, handlers);
    else create.mutate({ ...body, key: v.key, type: v.type }, handlers);
  });

  const previewField = { ...values, key: values.key || 'preview' };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? t('admin:fields.edit') : t('admin:fields.new')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={onSubmit} loading={create.isPending || update.isPending}>
            {t('actions.save')}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="flex justify-end">
            <Tabs
              size="sm"
              label={t('admin:programmeForm.contentLanguage')}
              value={lang}
              onChange={setLang}
              tabs={['en', 'es'].map((l) => ({ value: l, label: t(`language.names.${l}`) }))}
            />
          </div>

          <div hidden={lang !== 'en'} className="space-y-4">
            <Input {...labelReg} label={`${t('admin:fields.form.label')} (EN)`} error={errors.label?.en?.message} required />
            <Input {...register('helpText.en')} label={`${t('admin:fields.form.helpText')} (EN)`} />
          </div>
          <div hidden={lang !== 'es'} className="space-y-4" lang="es">
            <Input {...register('label.es')} label={`${t('admin:fields.form.label')} (ES)`} />
            <Input {...register('helpText.es')} label={`${t('admin:fields.form.helpText')} (ES)`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              {...register('key', { onChange: () => setKeyTouched(true) })}
              label={t('admin:fields.form.key')}
              hint={isEdit ? t('admin:fields.form.keyLocked') : t('admin:fields.form.keyHint')}
              error={errors.key?.message}
              disabled={isEdit}
              inputClassName="font-mono text-sm"
              required
            />
            <Select
              {...register('type')}
              label={t('admin:fields.form.type')}
              hint={isEdit ? t('admin:fields.form.typeLocked') : undefined}
              placeholder={false}
              disabled={isEdit}
              options={FIELD_TYPES.map((ty) => ({ value: ty, label: t(`admin:fields.types.${ty}`) }))}
            />
          </div>

          {needsOptions(values.type) && (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-ink">{t('admin:fields.form.options')}</legend>
              {options.fields.map((opt, index) => (
                <div key={opt.id} className="grid gap-2 rounded-xl border border-line bg-cream p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                  <Input
                    {...register(`options.${index}.value`)}
                    label={t('admin:fields.form.optionValue')}
                    error={errors.options?.[index]?.value?.message}
                    inputClassName="font-mono text-sm"
                  />
                  <Input {...register(`options.${index}.label.en`)} label={`${t('admin:fields.form.optionLabel')} (EN)`} />
                  <Input {...register(`options.${index}.label.es`)} label={`${t('admin:fields.form.optionLabel')} (ES)`} />
                  <Button
                    variant="ghost"
                    className="text-danger"
                    onClick={() => options.remove(index)}
                    aria-label={t('admin:fields.form.removeOption', { n: index + 1 })}
                  >
                    <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
                  </Button>
                </div>
              ))}
              {errors.options?.message && (
                <p role="alert" className="text-sm text-danger">
                  {t(errors.options.message)}
                </p>
              )}
              {errors.options?.root?.message && (
                <p role="alert" className="text-sm text-danger">
                  {t(errors.options.root.message)}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => options.append({ value: '', label: { en: '', es: '' } })}
                leftIcon={<Plus size={16} strokeWidth={1.75} aria-hidden="true" />}
              >
                {t('admin:fields.form.addOption')}
              </Button>
            </fieldset>
          )}

          <div className="space-y-4 rounded-xl border border-line p-4">
            {[
              ['required', 'admin:fields.form.required', 'admin:fields.form.requiredHint'],
              ['showToLearners', 'admin:fields.form.showToLearners', 'admin:fields.form.showToLearnersHint'],
              ['useInAI', 'admin:fields.form.useInAI', 'admin:fields.form.useInAIHint'],
            ].map(([name, label, hint]) => (
              <Controller
                key={name}
                control={control}
                name={name}
                render={({ field: f }) => <Switch label={t(label)} description={t(hint)} checked={f.value} onChange={f.onChange} />}
              />
            ))}
          </div>
        </div>

        <aside className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{t('admin:fields.preview')}</h3>
          <div className="rounded-xl border border-dashed border-emerald/40 bg-cream p-4">
            <DynamicField field={previewField} value={previewValue} onChange={setPreviewValue} />
          </div>
          <p className="text-xs text-ink-muted">{t('admin:fields.previewHint')}</p>
        </aside>
      </form>
    </Modal>
  );
}
