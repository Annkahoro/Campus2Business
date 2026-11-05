import mongoose from 'mongoose';
import { I18nText } from './_shared.js';

const { Schema } = mongoose;

export const RECOMMENDATION_STATUSES = ['generating', 'pending_review', 'approved', 'published', 'rejected', 'failed'];
export const PATHWAY_PHASES = ['foundation', 'core', 'advanced', 'specialisation'];
export const GAP_IMPORTANCE = ['high', 'medium', 'low'];

const stepSchema = new Schema(
  {
    programme: { type: Schema.Types.ObjectId, ref: 'Programme', required: true },
    order: Number,
    phase: { type: String, enum: PATHWAY_PHASES },
    reason: I18nText,
    matchScore: Number, // 0–100
    expectedOutcome: I18nText,
  },
  { _id: false },
);

const alternativeSchema = new Schema(
  { programme: { type: Schema.Types.ObjectId, ref: 'Programme', required: true }, reason: I18nText },
  { _id: false },
);

/**
 * docs/03 §7 — one document per generation; the latest published one is what the learner sees.
 * Deviation (reported): `strengths` and `skillGaps[].skill` are bilingual `{ en, es }` so the Spanish
 * pathway page is fully Spanish (docs/06 §1 principle 5).
 */
const recommendationSchema = new Schema(
  {
    learner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    profile: { type: Schema.Types.ObjectId, ref: 'LearnerProfile', required: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    version: { type: Number, default: 1 },

    aiDraft: {
      summary: I18nText,
      strengths: [{ _id: false, ...I18nText }],
      skillGaps: [{ _id: false, skill: I18nText, importance: { type: String, enum: GAP_IMPORTANCE } }],
      pathway: [stepSchema],
      alternatives: [alternativeSchema],
      confidence: Number,
    },

    final: {
      summary: I18nText,
      pathway: [stepSchema],
      alternatives: [alternativeSchema],
      adminNoteToLearner: I18nText,
    },

    internalNotes: { type: String, select: false }, // C2B only
    status: { type: String, enum: RECOMMENDATION_STATUSES, default: 'generating' },
    failureReason: String,
    rejectionReason: String,
    /** Post-processing notes for the admin (dropped IDs, inserted prerequisites…). */
    warnings: [{ _id: false, code: String, programme: { type: Schema.Types.ObjectId, ref: 'Programme' }, detail: String }],
    /** What the AI saw (admin only): catalogue IDs, history and patterns. */
    contextSnapshot: { type: Schema.Types.Mixed, select: false },

    aiMeta: {
      model: String,
      inputTokens: Number,
      outputTokens: Number,
      latencyMs: Number,
      promptVersion: String,
      catalogueSize: Number,
      attempts: Number,
    },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    publishedAt: Date,

    learnerFeedback: { rating: { type: Number, min: 1, max: 5 }, comment: String, at: Date },
  },
  { timestamps: true },
);

recommendationSchema.index({ learner: 1, createdAt: -1 });
recommendationSchema.index({ status: 1 });
// Guard (docs/06 §2): only one `generating` recommendation per learner at a time → AI_BUSY.
recommendationSchema.index(
  { learner: 1 },
  { name: 'one_generating_per_learner', unique: true, partialFilterExpression: { status: 'generating' } },
);

export const Recommendation = mongoose.models.Recommendation || mongoose.model('Recommendation', recommendationSchema);
export default Recommendation;
