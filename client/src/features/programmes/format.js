/** Display helpers for programmes. `t` must be the common-namespace translator. */

export const categoryLabel = (t, category) => t(`programme.categories.${category}`, { defaultValue: category });

export function formatPrice(price, lang, t) {
  if (!price || price.amount === null || price.amount === undefined) return null;
  if (price.amount === 0) return t('programme.free');
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: price.currency || 'EUR',
    maximumFractionDigits: price.amount % 1 === 0 ? 0 : 2,
  }).format(price.amount);
}

export function formatDuration(p, t) {
  if (!p?.durationValue || !p?.durationUnit) return null;
  return t(`programme.duration.${p.durationUnit}`, { count: p.durationValue });
}

export const formatDate = (date, lang) =>
  date ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(date)) : '';

/** Next intake starting today or later. */
export function nextIntake(programme) {
  const now = Date.now();
  return (programme?.intakes ?? [])
    .filter((i) => new Date(i.startDate).getTime() >= now)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
}
