import { ShopOrder } from '../../models/ShopOrder.js';
import { Programme } from '../../models/Programme.js';
import { Enrollment } from '../../models/Enrollment.js';
import { User } from '../../models/User.js';
import { ROLES } from '../../models/_shared.js';
import { applyShopPayment } from '../enrollment.service.js';
import { notifyAdmins } from '../notification.service.js';

/**
 * campus2b.com shop orders (WooCommerce webhook, topic "Order updated").
 *
 * A paid order (status processing/completed) is matched to the platform by
 *   billing email  → learner account (student or employee)
 *   line product   → programme (Programme.shopProductId or one of its intakes' shopProductId)
 * and activates that learner's enrollment. Each order is applied once, however often WooCommerce sends it.
 * Orders that cannot be matched are kept in ShopOrder; admins are told when a platform learner may be
 * waiting for that course, and can mark the enrollment as paid by hand.
 */

const PAID = ['processing', 'completed'];
const REVERSED = ['refunded', 'cancelled'];
const LEARNER_ROLES = [ROLES.STUDENT, ROLES.EMPLOYEE];

const titleParams = (programme) => ({
  programme: programme?.title?.en || programme?.title?.es || '',
  programmeEs: programme?.title?.es || programme?.title?.en || '',
});

function findProgramme(productId) {
  return Programme.findOne(
    { $or: [{ shopProductId: productId }, { 'intakes.shopProductId': productId }] },
    'title price shopProductId intakes',
  ).lean();
}

async function applyPaidOrder(order, raw) {
  const learner = order.email
    ? await User.findOne({ email: order.email, role: { $in: LEARNER_ROLES } }, 'name email role organization isActive')
    : null;

  const lines = [];
  for (const item of raw.line_items) {
    const productId = item.product_id;
    const line = { productId, name: item.name ?? '', quantity: item.quantity ?? 1, total: item.total ?? null };
    const programme = productId ? await findProgramme(productId) : null;

    if (!programme) {
      lines.push({ ...line, result: 'unknown_product' }); // a product that is not a platform programme
      continue;
    }
    line.programme = programme._id;

    if (!learner) {
      lines.push({ ...line, result: 'unknown_learner' });
      // Only worth an alert when someone on the platform is waiting to pay for this course
      // (they may have used another email at checkout); other website customers are not platform users.
      if (await Enrollment.exists({ programme: programme._id, status: 'payment_pending', 'payment.provider': 'shop' })) {
        await notifyAdmins('shop.orderUnmatched', { number: order.number, email: order.email, ...titleParams(programme) });
      }
      continue;
    }

    const intake = (programme.intakes ?? []).find((i) => i.shopProductId === productId);
    const { enrollment, result } = await applyShopPayment({
      learner,
      programme,
      intakeStartDate: intake?.startDate,
      order,
      line,
    });
    lines.push({ ...line, enrollment: enrollment._id, result });
    if (result === 'activated') {
      await notifyAdmins('shop.orderPaid', { number: order.number, name: learner.name, ...titleParams(programme) });
    }
  }

  await ShopOrder.updateOne({ orderId: order.orderId }, { $set: { lines, learner: learner?._id } });
  return lines;
}

/** POST /api/webhooks/woocommerce (verified and validated) → summary for the WooCommerce delivery log. */
export async function handleOrderWebhook(topic, raw) {
  const order = {
    orderId: raw.id,
    number: raw.number ?? String(raw.id),
    status: raw.status,
    email: (raw.billing?.email ?? '').trim().toLowerCase(),
    customerName: [raw.billing?.first_name, raw.billing?.last_name].filter(Boolean).join(' ').trim(),
    currency: raw.currency,
    total: raw.total,
    paidAt: raw.date_paid_gmt ? new Date(`${raw.date_paid_gmt.replace(/Z?$/, '')}Z`) : undefined,
  };
  if (order.paidAt && Number.isNaN(order.paidAt.getTime())) order.paidAt = undefined;

  const previous = await ShopOrder.findOneAndUpdate(
    { orderId: order.orderId },
    {
      $set: {
        number: order.number,
        status: order.status,
        email: order.email,
        customerName: order.customerName,
        currency: order.currency,
        total: order.total,
        ...(order.paidAt ? { paidAt: order.paidAt } : {}),
        lastTopic: topic,
      },
      $inc: { deliveries: 1 },
    },
    { upsert: true, new: false },
  ).lean();

  if (PAID.includes(order.status)) {
    // Claim the order so two deliveries arriving together cannot both apply it.
    const claimed = await ShopOrder.findOneAndUpdate(
      { orderId: order.orderId, processedAt: { $exists: false } },
      { $set: { processedAt: new Date() } },
    );
    if (!claimed) return { orderId: order.orderId, status: order.status, result: 'already_processed' };
    const lines = await applyPaidOrder(order, raw);
    return { orderId: order.orderId, status: order.status, result: 'processed', lines: lines.map(({ productId, result }) => ({ productId, result })) };
  }

  // A refund or cancellation after the course was activated: tell the admins, change nothing automatically.
  if (REVERSED.includes(order.status) && previous?.status !== order.status && previous?.lines?.some((l) => l.result === 'activated')) {
    await notifyAdmins('shop.orderReversed', { number: order.number, email: order.email, status: order.status });
  }
  return { orderId: order.orderId, status: order.status, result: 'recorded' };
}
