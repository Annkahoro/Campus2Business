/**
 * Picks the right language from a bilingual `{ en, es }` object, falling back to the other language.
 * Usage: loc(programme.title, i18n.language)
 */
export const loc = (obj, lang) =>
  obj?.[lang]?.trim() ? obj[lang] : obj?.[lang === 'en' ? 'es' : 'en'] ?? '';
