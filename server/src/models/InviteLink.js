import mongoose from 'mongoose';

const { Schema } = mongoose;

/** docs/03 §4 — employees join only through one of these. */
const inviteLinkSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    token: { type: String, required: true, unique: true }, // nanoid(24)
    label: String,
    department: String, // optional: pre-fills the employee's department
    expiresAt: { type: Date, default: null }, // null = never
    maxUses: { type: Number, default: null }, // null = unlimited (seat limit)
    usesCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

/** isUsable ignores the org status; the service checks that the org is approved. */
inviteLinkSchema.virtual('isUsable').get(function isUsable() {
  return (
    this.isActive &&
    (!this.expiresAt || this.expiresAt > new Date()) &&
    (this.maxUses === null || this.maxUses === undefined || this.usesCount < this.maxUses)
  );
});

export const InviteLink = mongoose.models.InviteLink || mongoose.model('InviteLink', inviteLinkSchema);
export default InviteLink;
