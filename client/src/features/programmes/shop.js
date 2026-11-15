/** campus2b.com shop product ID from "21983" or a pasted checkout/product URL with ?add-to-cart=21983 (else null). */
export function parseShopProductId(value) {
  const s = String(value ?? '').trim();
  const m = s.match(/[?&]add-to-cart=(\d+)/) ?? s.match(/^(\d+)$/);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const SHOP_PRODUCT_EXAMPLE = 'https://www.campus2b.com/finalizar-compra/?add-to-cart=21983&quantity=1';
