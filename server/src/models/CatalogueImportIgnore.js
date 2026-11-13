import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A campus2b.com course page a C2B admin chose not to import (e.g. a one-off webinar).
 * The "Import from campus2b.com" tool hides these until an admin restores them.
 */
const catalogueImportIgnoreSchema = new Schema(
  {
    url: { type: String, required: true, unique: true, trim: true },
    title: { type: String, trim: true, default: '' },
    ignoredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const CatalogueImportIgnore =
  mongoose.models.CatalogueImportIgnore || mongoose.model('CatalogueImportIgnore', catalogueImportIgnoreSchema);
export default CatalogueImportIgnore;
