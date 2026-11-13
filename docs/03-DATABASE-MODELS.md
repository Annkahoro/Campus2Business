# 03 — Database Models (Mongoose)

All schemas use `{ timestamps: true }`. Bilingual text uses the shape `{ en: String, es: String }`, written below as `I18nText`.

```js
// models/_shared.js
export const I18nText = { en: { type: String, trim: true, default: '' }, es: { type: String, trim: true, default: '' } };
```

---

## 1. User
Login identity for every role.
```js
{
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, select: false },          // absent for Google-only users
  googleId:      { type: String, index: true, sparse: true },
  authProvider:  { type: String, enum: ['local', 'google'], default: 'local' },
  role:          { type: String, enum: ['c2b_admin', 'org_admin', 'student', 'employee'], required: true },
  organization:  { type: ObjectId, ref: 'Organization' },   // org_admin + employee only
  avatar:        { url: String, publicId: String },
  preferredLanguage: { type: String, enum: ['en', 'es'], default: 'en' },
  isActive:      { type: Boolean, default: true },
  isSuperAdmin:  { type: Boolean, default: false },  // main C2B admin (SEED_ADMIN_* on the server); at most one
  lastLoginAt:   Date,
}
```
- Pre-save hook hashes `password` with bcrypt (cost 10).
- Method `comparePassword(plain)`.
- Index: `{ role: 1, organization: 1 }`.

---

## 2. LearnerProfile
One per student or employee. This is the core input for the AI.
```js
{
  user:          { type: ObjectId, ref: 'User', required: true, unique: true },
  learnerType:   { type: String, enum: ['student', 'employee'], required: true },
  organization:  { type: ObjectId, ref: 'Organization' },   // employees only

  // Step 1 — personal
  phone: String,
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  country: String,
  city: String,
  languages: [{ name: String, level: { type: String, enum: ['basic', 'intermediate', 'fluent', 'native'] } }],
  bio: { type: String, maxlength: 1000 },

  // Step 2 — education / study history
  education: [{
    institution: String,
    qualification: String,          // e.g. BSc, Diploma, MSc
    fieldOfStudy: String,
    startYear: Number,
    endYear: Number,                // null = ongoing
    currentYearOfStudy: Number,     // students
    grade: String,
    keyCourses: [String],
  }],
  certifications: [{ name: String, issuer: String, year: Number, credentialUrl: String }],

  // Step 3 — employment (required for employees, optional for students)
  employment: {
    department: String,             // must be one of the org's departments for employees
    jobTitle: String,
    yearsInRole: Number,
    totalYearsExperience: Number,
    responsibilities: String,
    managesPeople: Boolean,
  },
  pastExperience: [{ company: String, title: String, startYear: Number, endYear: Number, summary: String }],

  // Step 4 — skills
  skills: [{
    name: String,
    category: { type: String, enum: ['technical', 'soft', 'digital', 'business', 'language', 'other'] },
    level: { type: Number, min: 1, max: 5 },
  }],

  // Step 5 — interests and goals
  hobbies: [String],
  interests: [String],              // topics they want to learn
  careerGoals: {
    shortTerm: String,              // next 12 months
    longTerm: String,               // 3–5 years
    targetRoles: [String],
  },
  learningPreferences: {
    mode: { type: String, enum: ['online', 'in_person', 'hybrid', 'any'], default: 'any' },
    hoursPerWeek: Number,
    preferredLanguage: { type: String, enum: ['en', 'es', 'any'], default: 'any' },
    budgetRange: { type: String, enum: ['free', 'low', 'medium', 'high', 'employer_paid'] },
    preferredStart: Date,
  },

  // Step 6 — CV
  cv: {
    url: String, publicId: String, fileName: String, uploadedAt: Date,
    extractedText: { type: String, select: false },   // used by AI only; capped at ~12k chars
  },

  // Org remarks (written by org_admin; employee sees read-only)
  orgRemarks: [{
    text: { type: String, required: true, maxlength: 2000 },
    category: { type: String, enum: ['performance', 'potential', 'priority_skill', 'manager_note', 'other'], default: 'other' },
    author: { type: ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  }],

  // Workflow
  completionPercent: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'complete', 'submitted', 'under_review', 'pathway_published'],
    default: 'draft',
  },
  submittedAt: Date,
  submittedBy: { type: ObjectId, ref: 'User' },   // self (student) or org_admin (employee)
}
```
- `completionPercent` is recalculated in `profile.service.js` on every save (weighted: personal 10, education 20,
  employment 15 for employees / 5 for students, skills 20, goals 25, CV 10).
- Index: `{ organization: 1, status: 1 }`, `{ learnerType: 1, status: 1 }`.

---

## 3. Organization
```js
{
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, unique: true },
  logo:        { url: String, publicId: String },
  industry:    String,
  size:        { type: String, enum: ['1-10', '11-50', '51-200', '201-500', '500+'] },
  country: String, city: String, website: String,
  contactPerson: { name: String, email: String, phone: String, position: String },
  description: { type: String, maxlength: 2000 },
  departments: [{ name: { type: String, required: true }, headcount: Number }],   // e.g. ICT, Finance, HR, Sales
  goals:       [String],         // strategic goals
  objectives:  [String],         // training objectives
  skillGaps:   [String],         // perceived skill gaps
  trainingBudget: { type: String, enum: ['low', 'medium', 'high', 'undisclosed'], default: 'undisclosed' },
  digitalMaturity: { type: Number, min: 1, max: 5 },   // self-assessed
  additionalInfo: String,

  owner:   { type: ObjectId, ref: 'User', required: true },   // org_admin
  status:  { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  reviewedBy: { type: ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: String,
}
```

---

## 4. InviteLink
```js
{
  organization: { type: ObjectId, ref: 'Organization', required: true, index: true },
  token:        { type: String, required: true, unique: true },   // nanoid(24)
  label:        String,                                            // e.g. "Finance team Q1"
  department:   String,                                            // optional: pre-fills employee department
  expiresAt:    Date,                                              // null = never
  maxUses:      Number,                                            // null = unlimited (seat limit)
  usesCount:    { type: Number, default: 0 },
  isActive:     { type: Boolean, default: true },
  createdBy:    { type: ObjectId, ref: 'User' },
}
```
- Virtual `isUsable` = `isActive && (!expiresAt || expiresAt > now) && (!maxUses || usesCount < maxUses)` and the org is `approved`.

---

## 5. ProgrammeField  (admin-defined custom fields)
The "open space" that lets the C2B admin add new programme fields without code changes.
```js
{
  key:      { type: String, required: true, unique: true, match: /^[a-z][a-zA-Z0-9_]*$/ },  // e.g. certificationBody
  label:    I18nText,
  type:     { type: String, enum: ['text', 'textarea', 'number', 'select', 'multiselect', 'boolean', 'date', 'url'], required: true },
  options:  [{ value: String, label: I18nText }],   // select / multiselect only
  required: { type: Boolean, default: false },
  helpText: I18nText,
  showToLearners: { type: Boolean, default: true },
  useInAI:  { type: Boolean, default: true },       // include this field in the AI catalogue
  order:    { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}
```

---

## 6. Programme
```js
{
  code:        { type: String, unique: true },         // e.g. C2B-EL-01 (eLearning) / C2B-GN-01 (General)
  title:       I18nText,
  shortDescription: I18nText,
  description: I18nText,
  coverImage:  { url: String, publicId: String },
  catalogue:   { type: String, enum: ['elearning', 'general'], required: true }, // as on campus2b.com: self-paced online vs scheduled dates
  categories:  [String],      // Category slugs (min 1); first = primary. A programme can be in several categories
  featured:    Boolean,       // "Destacados": shown first in the catalogue and on the landing page
  subsidised:  Boolean,       // shown as "Subsidised" instead of a price; enrollment amount = 0
  topics:      { en: [String], es: [String] },   // "Topics covered"
  idealFor:    { en: [String], es: [String] },   // "It's for you or your company if…"
  organizer:   { type: String, default: 'C2B' },
  level:       { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'], required: true },
  durationValue: Number,
  durationUnit:  { type: String, enum: ['hours', 'days', 'weeks', 'months'] },
  deliveryMode:  { type: String, enum: ['online', 'in_person', 'hybrid'] },
  language:      [{ type: String, enum: ['en', 'es'] }],
  prerequisites: [{ type: ObjectId, ref: 'Programme' }],   // other programmes
  prerequisiteText: I18nText,                               // free-text prerequisites
  skillsGained:  [String],
  targetAudience: [{ type: String, enum: ['student', 'employee'] }],
  targetDepartments: [String],    // e.g. ICT, Finance — empty = all
  price:     { amount: Number, currency: { type: String, default: 'EUR' } },
  intakes:   [{ startDate: Date, endDate: Date, startTime: 'HH:mm', endTime: 'HH:mm', note: I18nText, seats: Number, location: String }],
  tags:      [String],

  customFields: { type: Map, of: Schema.Types.Mixed, default: {} },   // keyed by ProgrammeField.key
  sourceUrls:   [String],   // campus2b.com course page(s) it was imported from (several when repeat runs were merged); admins only

  status:    { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  createdBy: { type: ObjectId, ref: 'User' },
}
```
- Text index on `title.en`, `title.es`, `skillsGained`, `tags` (used for AI pre-filtering).
- The real C2B catalogue (52 courses imported from campus2b.com, Spanish originals + English translations) is in `server/src/seed/programmes.json`; `npm run catalogue:sync` imports it into an existing database and archives the 15 old demo programmes (admin-created programmes are left alone). `npm run seed` backfills `sourceUrls` on existing programmes (matched by code).
- Imported later through Admin → Programmes → "Import from campus2b.com": new site courses become `draft` programmes (Spanish text, next `C2B-EL-NN` / `C2B-GN-NN` code), or their dates are added to an existing programme.

### 6b. Category
```js
{
  slug:     { type: String, unique: true, immutable: true },  // e.g. artificial_intelligence
  name:     I18nText,
  order:    Number,     // order of the catalogue filter chips
  isActive: Boolean,    // inactive = hidden from filters and the programme form; programmes keep the slug
}
```
- Managed by C2B admins (`/admin/categories`). Seeded from `server/src/seed/categories.json` (the campus2b.com categories).
### 6c. CatalogueImportIgnore
```js
{
  url:       { type: String, unique: true },  // canonical campus2b.com course URL
  title:     String,
  ignoredBy: { type: ObjectId, ref: 'User' },
}
```
- campus2b.com courses an admin chose not to import (e.g. webinars); hidden from the import list until restored. Seeded from `server/src/seed/import-ignore.json`.

- `programme.service.js` validates `customFields` against the active `ProgrammeField` definitions (type checks, required).

---

## 7. Recommendation
One document per generation. The latest is the active one.
```js
{
  learner:   { type: ObjectId, ref: 'User', required: true, index: true },
  profile:   { type: ObjectId, ref: 'LearnerProfile', required: true },
  organization: { type: ObjectId, ref: 'Organization' },
  version:   { type: Number, default: 1 },

  aiDraft: {                          // exactly what Claude returned (validated), never edited
    summary: I18nText,
    strengths: [String],
    skillGaps: [{ skill: String, importance: { type: String, enum: ['high', 'medium', 'low'] } }],
    pathway: [{
      programme: { type: ObjectId, ref: 'Programme' },
      order: Number,
      phase: { type: String, enum: ['foundation', 'core', 'advanced', 'specialisation'] },
      reason: I18nText,
      matchScore: Number,              // 0–100
      expectedOutcome: I18nText,
    }],
    alternatives: [{ programme: { type: ObjectId, ref: 'Programme' }, reason: I18nText }],
    confidence: Number,                // 0–100
  },

  final: {                            // admin-edited version (starts as a copy of aiDraft)
    summary: I18nText,
    pathway: [/* same shape as aiDraft.pathway */],
    alternatives: [/* same shape */],
    adminNoteToLearner: I18nText,     // visible to learner
  },

  internalNotes: { type: String, select: false },   // C2B only
  status: { type: String, enum: ['generating', 'pending_review', 'approved', 'published', 'rejected', 'failed'], default: 'generating' },
  failureReason: String,

  aiMeta: {
    model: String,
    inputTokens: Number,
    outputTokens: Number,
    latencyMs: Number,
    promptVersion: String,
    catalogueSize: Number,
  },
  generatedBy: { type: ObjectId, ref: 'User' },
  reviewedBy:  { type: ObjectId, ref: 'User' },
  reviewedAt:  Date,
  publishedAt: Date,

  learnerFeedback: { rating: { type: Number, min: 1, max: 5 }, comment: String, at: Date },
}
```
- Index: `{ learner: 1, createdAt: -1 }`, `{ status: 1 }`.

---

## 8. Enrollment
Also serves as the **historical learning path** data source.
```js
{
  learner:   { type: ObjectId, ref: 'User', required: true, index: true },
  programme: { type: ObjectId, ref: 'Programme', required: true },
  organization: { type: ObjectId, ref: 'Organization' },
  recommendation: { type: ObjectId, ref: 'Recommendation' },   // if it came from a pathway
  intakeStartDate: Date,

  status: {
    type: String,
    enum: ['requested', 'approved', 'rejected', 'payment_pending', 'active', 'completed', 'dropped'],
    default: 'requested',
  },
  payment: {
    simulated: { type: Boolean, default: true },
    amount: Number, currency: String,
    method: { type: String, enum: ['card', 'mpesa', 'bank', 'employer_invoice'] },
    reference: String,           // e.g. SIM-8F3K2A
    status: { type: String, enum: ['unpaid', 'paid', 'waived'], default: 'unpaid' },
    paidAt: Date,
  },
  progressPercent: { type: Number, default: 0 },
  startedAt: Date,
  completedAt: Date,
  score: Number,                 // 0–100
  learnerRating: { type: Number, min: 1, max: 5 },
  learnerReview: String,
  adminNotes: { type: String, select: false },
}
```
- Unique index: `{ learner: 1, programme: 1, status: 1 }` partial on active statuses, to prevent duplicate active enrollments.

---

## 9. Notification
```js
{
  recipient: { type: ObjectId, ref: 'User', required: true, index: true },
  type:      { type: String, required: true },          // see 10-REALTIME-NOTIFICATIONS
  titleKey:  String,                                    // i18n key, e.g. notifications.pathwayPublished.title
  bodyKey:   String,
  params:    Schema.Types.Mixed,                        // interpolation values
  link:      String,                                    // frontend route
  isRead:    { type: Boolean, default: false },
}
```
Notifications store **i18n keys**, not sentences, so they display in the reader's current language.

---

## 10. AuditLog (light)
```js
{ actor: ObjectId, action: String, entity: String, entityId: ObjectId, meta: Mixed }
```
Logged for: org approval/rejection, recommendation publish, remark edits, enrollment status changes.

---

## Relationships at a glance
```
Organization 1──* User(org_admin, employee)
Organization 1──* InviteLink
User 1──1 LearnerProfile
User 1──* Recommendation *──* Programme
User 1──* Enrollment *──1 Programme
ProgrammeField *──(defines keys of)── Programme.customFields
Category 1──* Programme.categories (by slug)
```
