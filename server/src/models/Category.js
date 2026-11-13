import mongoose from 'mongoose';
import { I18nText } from './_shared.js';

const { Schema } = mongoose;

export const CATEGORY_SLUG_REGEX = /^[a-z][a-z0-9_]{1,59}$/;

/**
 * Programme category managed by C2B admins (e.g. "Artificial intelligence", "ITIL").
 * Programmes store category slugs; a programme can have several. Categories are shared by both catalogues
 * (eLearning and General); the public filter chips only show categories that have published programmes
 * in the selected catalogue.
 */
const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, match: CATEGORY_SLUG_REGEX, immutable: true },
    name: I18nText,
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ isActive: 1, order: 1 });

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export default Category;
