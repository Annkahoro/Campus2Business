import mongoose from 'mongoose';
import { I18nText } from './_shared.js';

const { Schema } = mongoose;

export const FIELD_TYPES = ['text', 'textarea', 'number', 'select', 'multiselect', 'boolean', 'date', 'url'];
export const FIELD_KEY_REGEX = /^[a-z][a-zA-Z0-9_]*$/;

/** Admin-defined custom programme field — the "open space" (docs/03 §5). */
const programmeFieldSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, match: FIELD_KEY_REGEX, immutable: true },
    label: I18nText,
    type: { type: String, enum: FIELD_TYPES, required: true, immutable: true },
    options: [{ _id: false, value: { type: String, required: true }, label: I18nText }],
    required: { type: Boolean, default: false },
    helpText: I18nText,
    showToLearners: { type: Boolean, default: true },
    useInAI: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

programmeFieldSchema.index({ isActive: 1, order: 1 });

export const ProgrammeField = mongoose.models.ProgrammeField || mongoose.model('ProgrammeField', programmeFieldSchema);
export default ProgrammeField;
