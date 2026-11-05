/** Bilingual text shape `{ en, es }` used across models (docs/03). */
export const I18nText = {
  en: { type: String, trim: true, default: '' },
  es: { type: String, trim: true, default: '' },
};

export const ROLES = Object.freeze({
  C2B_ADMIN: 'c2b_admin',
  ORG_ADMIN: 'org_admin',
  STUDENT: 'student',
  EMPLOYEE: 'employee',
});

export const ROLE_VALUES = Object.values(ROLES);
export const LANGUAGES = ['en', 'es'];
