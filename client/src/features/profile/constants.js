export const WIZARD_STEPS = ['personal', 'education', 'employment', 'skills', 'goals', 'cv', 'review'];
export const SUBMIT_THRESHOLD = 80;

export const GENDERS = ['female', 'male', 'other', 'prefer_not_to_say'];
export const LANGUAGE_LEVELS = ['basic', 'intermediate', 'fluent', 'native'];
export const SKILL_CATEGORIES = ['technical', 'digital', 'business', 'soft', 'language', 'other'];
export const LEARNING_MODES = ['any', 'online', 'in_person', 'hybrid'];
export const BUDGET_RANGES = ['free', 'low', 'medium', 'high', 'employer_paid'];
export const PREFERRED_LANGS = ['any', 'en', 'es'];
export const REMARK_CATEGORIES = ['performance', 'potential', 'priority_skill', 'manager_note', 'other'];

/* Form <-> API value helpers (form inputs hold strings). */
export const toStr = (v) => (v === null || v === undefined ? '' : String(v));
export const toNum = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
export const toInt = (v) => (toNum(v) === null ? null : Math.round(Number(v)));
export const toDateInput = (d) => (d ? String(d).slice(0, 10) : '');
export const orNull = (v) => (v === '' || v === undefined ? null : v);
