import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ORG_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];
export const ORG_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];
export const TRAINING_BUDGETS = ['low', 'medium', 'high', 'undisclosed'];

/** docs/03 §3 */
const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    logo: { url: String, publicId: String },
    industry: String,
    size: { type: String, enum: [...ORG_SIZES, null] },
    country: String,
    city: String,
    website: String,
    contactPerson: { name: String, email: String, phone: String, position: String },
    description: { type: String, maxlength: 2000 },
    departments: [{ _id: false, name: { type: String, required: true }, headcount: Number }],
    goals: [String],
    objectives: [String],
    skillGaps: [String],
    trainingBudget: { type: String, enum: TRAINING_BUDGETS, default: 'undisclosed' },
    digitalMaturity: { type: Number, min: 1, max: 5 },
    additionalInfo: String,

    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ORG_STATUSES, default: 'pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: String,
    // Cached org AI summary (docs/06 §10): { result, meta, generatedAt } — 24 h cache.
    aiSummary: { type: Schema.Types.Mixed, select: false },
  },
  { timestamps: true },
);

organizationSchema.index({ status: 1, createdAt: -1 });
organizationSchema.index({ owner: 1 });

export const Organization = mongoose.models.Organization || mongoose.model('Organization', organizationSchema);
export default Organization;
