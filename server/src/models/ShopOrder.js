import mongoose from 'mongoose';

const { Schema } = mongoose;

/** What happened to each line of a campus2b.com order on the platform. */
export const SHOP_LINE_RESULTS = [
  'activated', // the learner's enrollment is now active
  'already_active', // it was already active or completed
  'unknown_product', // no programme has this shop product ID
  'unknown_learner', // no learner account with the order's billing email
];

/**
 * Orders received from the campus2b.com shop (WooCommerce webhook). One document per WooCommerce order,
 * updated on every delivery, so repeated deliveries never activate anything twice.
 */
const shopOrderSchema = new Schema(
  {
    orderId: { type: Number, required: true, unique: true },
    number: String,
    status: String, // WooCommerce order status: pending, processing, completed, refunded, cancelled…
    email: { type: String, lowercase: true, trim: true },
    customerName: String,
    currency: String,
    total: Number,
    paidAt: Date,
    learner: { type: Schema.Types.ObjectId, ref: 'User' },
    lines: [
      {
        _id: false,
        productId: Number,
        name: String,
        quantity: Number,
        total: Number,
        programme: { type: Schema.Types.ObjectId, ref: 'Programme' },
        enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment' },
        result: { type: String, enum: SHOP_LINE_RESULTS },
      },
    ],
    processedAt: Date, // when the paid order was applied to enrollments
    lastTopic: String,
    deliveries: { type: Number, default: 0 },
  },
  { timestamps: true },
);

shopOrderSchema.index({ email: 1 });

export const ShopOrder = mongoose.models.ShopOrder || mongoose.model('ShopOrder', shopOrderSchema);
export default ShopOrder;
