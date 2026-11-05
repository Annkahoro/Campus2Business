import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ENROLLMENT_STATUSES = ['requested', 'approved', 'rejected', 'payment_pending', 'active', 'completed', 'dropped'];
export const ACTIVE_ENROLLMENT_STATUSES = ['requested', 'approved', 'payment_pending', 'active'];
export const PAYMENT_METHODS = ['card', 'mpesa', 'bank', 'employer_invoice'];

/**
 * docs/03 §8 — also the learner's historical learning path (AI input).
 * Registered in Phase 5 because the AI context builder and historical signals read it;
 * the enrollment endpoints and screens arrive in Phase 7.
 */
const enrollmentSchema = new Schema(
  {
    learner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    programme: { type: Schema.Types.ObjectId, ref: 'Programme', required: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    recommendation: { type: Schema.Types.ObjectId, ref: 'Recommendation' },
    intakeStartDate: Date,
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // learner, or org admin enrolling on behalf

    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'requested' },
    payment: {
      simulated: { type: Boolean, default: true },
      amount: Number,
      currency: String,
      method: { type: String, enum: PAYMENT_METHODS },
      reference: String,
      status: { type: String, enum: ['unpaid', 'paid', 'waived'], default: 'unpaid' },
      paidAt: Date,
    },
    progressPercent: { type: Number, default: 0 },
    startedAt: Date,
    completedAt: Date,
    score: Number,
    learnerRating: { type: Number, min: 1, max: 5 },
    learnerReview: String,
    adminNotes: { type: String, select: false },
  },
  { timestamps: true },
);

// One open enrollment per learner and programme.
enrollmentSchema.index(
  { learner: 1, programme: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE_ENROLLMENT_STATUSES } } },
);
enrollmentSchema.index({ status: 1, programme: 1, completedAt: 1 });

export const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', enrollmentSchema);
export default Enrollment;
