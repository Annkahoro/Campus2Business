import { z } from 'zod';
import { FIELD_KEY_REGEX, FIELD_TYPES } from '../models/ProgrammeField.js';
import { i18nText, i18nTextRequired, objectId } from './common.js';

const option = z.object({
  value: z.string().trim().min(1).max(100),
  label: i18nTextRequired(200),
});

const optionsList = z
  .array(option)
  .max(100)
  .refine((opts) => new Set(opts.map((o) => o.value)).size === opts.length, { message: 'DUPLICATE_OPTION_VALUE' });

const editable = {
  label: i18nTextRequired(200),
  options: optionsList,
  required: z.boolean(),
  helpText: i18nText(500),
  showToLearners: z.boolean(),
  useInAI: z.boolean(),
  order: z.number().int().min(0).max(10000),
};

const needsOptions = (type) => type === 'select' || type === 'multiselect';

export const createFieldSchema = z
  .object({
    key: z.string().trim().min(2).max(50).regex(FIELD_KEY_REGEX, 'INVALID_FIELD_KEY'),
    type: z.enum(FIELD_TYPES),
    label: editable.label,
    options: editable.options.optional(),
    required: editable.required.optional(),
    helpText: editable.helpText.optional(),
    showToLearners: editable.showToLearners.optional(),
    useInAI: editable.useInAI.optional(),
    order: editable.order.optional(),
  })
  .refine((v) => !needsOptions(v.type) || (v.options?.length ?? 0) > 0, {
    message: 'OPTIONS_REQUIRED',
    path: ['options'],
  });

/** `key` and `type` are immutable after creation: .strict() rejects them. */
export const updateFieldSchema = z
  .object({
    label: editable.label.optional(),
    options: editable.options.optional(),
    required: editable.required.optional(),
    helpText: editable.helpText.optional(),
    showToLearners: editable.showToLearners.optional(),
    useInAI: editable.useInAI.optional(),
    order: editable.order.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const reorderFieldsSchema = z.object({
  ids: z.array(objectId).min(1).max(500),
});
