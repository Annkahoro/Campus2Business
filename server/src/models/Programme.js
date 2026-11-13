import mongoose from 'mongoose';
import { I18nList, I18nText } from './_shared.js';

const { Schema } = mongoose;

export const PROGRAMME_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
export const DURATION_UNITS = ['hours', 'days', 'weeks', 'months'];
export const DELIVERY_MODES = ['online', 'in_person', 'hybrid'];
export const PROGRAMME_STATUSES = ['draft', 'published', 'archived'];
export const AUDIENCES = ['student', 'employee'];

/**
 * The two C2B catalogues (mirrors campus2b.com):
 * - elearning: self-paced online courses on the virtual platform, start any time
 * - general:   scheduled courses (live virtual classroom or in person) with fixed dates on the training calendar
 */
export const CATALOGUES = ['elearning', 'general'];

const programmeSchema = new Schema(
  {
    code: { type: String, unique: true, sparse: true, trim: true, uppercase: true }, // e.g. C2B-DT-101
    title: I18nText,
    shortDescription: I18nText,
    description: I18nText,
    coverImage: { url: String, publicId: String },
    catalogue: { type: String, enum: CATALOGUES, required: true, default: 'elearning' },
    categories: { type: [{ type: String, trim: true }], default: [] }, // Category slugs; first = primary
    featured: { type: Boolean, default: false }, // "Destacados" on campus2b.com
    subsidised: { type: Boolean, default: false }, // shown as "Subsidised" instead of a price
    topics: I18nList, // "Topics covered"
    idealFor: I18nList, // "It's for your company if…"
    organizer: { type: String, trim: true, default: 'C2B' },
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
    intakes: [
      {
        startDate: Date,
        endDate: Date,
        startTime: String, // 'HH:mm'
        endTime: String, // 'HH:mm'
        note: I18nText, // e.g. 'Tuesdays and Thursdays'
        seats: Number,
        location: String,
      },
    ],
    tags: [String],

    // campus2b.com course pages this programme was imported from (several when repeat runs were merged).
    // Used by the admin "Import from campus2b.com" tool to find courses that are not on the platform yet.
    sourceUrls: { type: [{ type: String, trim: true }], default: [] },

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
programmeSchema.index({ status: 1, catalogue: 1, categories: 1 });
programmeSchema.index({ sourceUrls: 1 });

export const Programme = mongoose.models.Programme || mongoose.model('Programme', programmeSchema);
export default Programme;
