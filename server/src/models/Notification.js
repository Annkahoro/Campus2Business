import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * docs/03 §9 — stored so users see what they missed while offline.
 * Stores i18n keys (not sentences) so it displays in the reader's current language.
 */
const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true }, // see docs/10 §3
    titleKey: String, // e.g. notifications.pathwayPublished.title
    bodyKey: String,
    params: Schema.Types.Mixed,
    link: String, // frontend route
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
// Keep the collection small: notifications expire after 180 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
