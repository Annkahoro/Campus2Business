/** Display helpers for programmes. `t` must be the common-namespace translator. */

export function formatPrice(price, lang, t) {
  if (!price || price.amount === null || price.amount === undefined) return null;
  if (price.amount === 0) return t('programme.free');
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: price.currency || 'EUR',
    maximumFractionDigits: price.amount % 1 === 0 ? 0 : 2,
  }).format(price.amount);
}

/** Price line for cards and headers: "Subsidised" wins over any amount. */
export const priceLabel = (p, lang, t) => (p?.subsidised ? t('programme.subsidised') : formatPrice(p?.price, lang, t));

export function formatDuration(p, t) {
  if (!p?.durationValue || !p?.durationUnit) return null;
  return t(`programme.duration.${p.durationUnit}`, { count: p.durationValue });
}

export const formatDate = (date, lang) =>
  date ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(date)) : '';

/** "3 Dec 2026 – 17 Dec 2026" */
export const formatDateRange = (intake, lang) =>
  [formatDate(intake.startDate, lang), intake.endDate ? formatDate(intake.endDate, lang) : null].filter(Boolean).join(' – ');

/** "09:30 – 14:30" or '' */
export const formatTimeRange = (intake) => (intake?.startTime ? [intake.startTime, intake.endTime].filter(Boolean).join(' – ') : '');

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Intakes that have not finished yet (end date, or start date when single-day), soonest first. */
export function upcomingIntakes(programme) {
  const today = startOfToday();
  return (programme?.intakes ?? [])
    .filter((i) => new Date(i.endDate ?? i.startDate).getTime() >= today)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
}

/** Next intake that has not finished yet. */
export const nextIntake = (programme) => upcomingIntakes(programme)[0];
