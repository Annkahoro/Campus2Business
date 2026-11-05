import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Light audit trail (docs/03 §10): org decisions, remark edits, publishes, enrollment status changes. */
const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entity: String,
    entityId: Schema.Types.ObjectId,
    meta: Schema.Types.Mixed,
  },
  { timestamps: true },
);

auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

/** Never throws: auditing must not break the request. */
export async function audit(actor, action, entity, entityId, meta) {
  try {
    await AuditLog.create({ actor, action, entity, entityId, meta });
  } catch (err) {
    console.warn('⚠️  audit log failed:', err.message);
  }
}

export default AuditLog;
