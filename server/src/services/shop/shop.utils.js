import { env } from '../../config/env.js';

/**
 * campus2b.com shop (WooCommerce) helpers. Paid programmes are bought on the C2B website:
 * https://www.campus2b.com/finalizar-compra/?add-to-cart=<productId>&quantity=1
 */

const dayKey = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

/** "21983", 21983 or a pasted checkout/product URL with ?add-to-cart=21983 → 21983 (or null). */
export function parseShopProductId(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null;
  const s = String(value).trim();
  const m = s.match(/[?&]add-to-cart=(\d+)/) ?? s.match(/^(\d+)$/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function checkoutUrlFor(productId) {
  const url = new URL(env.SHOP_CHECKOUT_URL);
  url.searchParams.set('add-to-cart', String(productId));
  url.searchParams.set('quantity', '1');
  return url.toString();
}

/** Paid programmes only: subsidised and free ones keep the request → C2B approval flow. */
export const isPaidProgramme = (p) => !p?.subsidised && Number(p?.price?.amount) > 0;

/**
 * Which shop product to sell for this programme:
 * 1. the chosen intake's own product, 2. the next upcoming intake that has one, 3. the programme's product.
 */
export function resolveShopProduct(programme, intakeStartDate) {
  const intakes = programme?.intakes ?? [];
  if (intakeStartDate) {
    const chosen = intakes.find((i) => dayKey(i.startDate) === dayKey(intakeStartDate));
    if (chosen?.shopProductId) return { productId: chosen.shopProductId, intakeStartDate: chosen.startDate };
  }
  const next = intakes
    .filter((i) => i.shopProductId && new Date(i.startDate).getTime() >= Date.now() - 24 * 3600 * 1000)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
  if (!intakeStartDate && next) return { productId: next.shopProductId, intakeStartDate: next.startDate };
  if (programme?.shopProductId) return { productId: programme.shopProductId, intakeStartDate: intakeStartDate ?? null };
  if (next) return { productId: next.shopProductId, intakeStartDate: next.startDate };
  return null;
}

/** Shown to learners: true when the "Buy on campus2b.com" button can be offered. */
export const canBuyOnShop = (p) => isPaidProgramme(p) && !!resolveShopProduct(p, null);
