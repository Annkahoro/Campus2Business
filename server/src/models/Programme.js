import mongoose from 'mongoose';
import { I18nText } from './_shared.js';

const { Schema } = mongoose;

export const PROGRAMME_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
export const DURATION_UNITS = ['hours', 'days', 'weeks', 'months'];
export const DELIVERY_MODES = ['online', 'in_person', 'hybrid'];
export const PROGRAMME_STATUSES = ['draft', 'published', 'archived'];
export const AUDIENCES = ['student', 'employee'];

/**
 * Standard C2B catalogue categories (stored as slugs, translated on the client).
 * The schema accepts any string so C2B can add categories later.
 */
export const PROGRAMME_CATEGORIES = [
  'digital_transformation',
  'data_ai',
  'cloud',
  'cybersecurity',
  'agile_pm',
  'leadership_change',
  'finance',
  'hr_people',
  'marketing_ecommerce',
  'soft_skills',
];

const programmeSchema = new Schema(
  {
    code: { type: String, unique: true, sparse: true, trim: true, uppercase: true }, // e.g. C2B-DT-101
    title: I18nText,
    shortDescription: I18nText,
    description: I18nText,
    coverImage: { url: String, publicId: String },
    category: { type: String, required: true, trim: true },
    level: { type: String, enum: PROGRAMME_LEVELS, required: true },
    durationValue: Number,
    durationUnit: { type: String, enum: DURATION_UNITS },
    deliveryMode: { type: String, enum: DELIVERY_MODES },
    language: [{ type: String, enum: ['en', 'es'] }],
    prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Programme' }],
    prerequisiteText: I18nText,
    skillsGained: [String],
    targetAudience: [{ type: String, enum: AUDIENCES }],
    targetDepartments: [String], // empty = all
    price: { amount: Number, currency: { type: String, default: 'EUR' } },
    intakes: [{ startDate: Date, endDate: Date, seats: Number, location: String }],
    tags: [String],

    customFields: { type: Map, of: Schema.Types.Mixed, default: {} }, // keyed by ProgrammeField.key

    status: { type: String, enum: PROGRAMME_STATUSES, default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// Used for AI pre-filtering (docs/06).
programmeSchema.index(
  { 'title.en': 'text', 'title.es': 'text', skillsGained: 'text', tags: 'text' },
  // `language` is our own array field, so point Mongo's per-document language override elsewhere.
  { name: 'programme_text', default_language: 'none', language_override: 'textSearchLanguage' },
);
programmeSchema.index({ status: 1, category: 1, level: 1 });

export const Programme = mongoose.models.Programme || mongoose.model('Programme', programmeSchema);
export default Programme;
