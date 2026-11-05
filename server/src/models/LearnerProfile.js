import mongoose from 'mongoose';

const { Schema } = mongoose;

export const PROFILE_STATUSES = ['draft', 'complete', 'submitted', 'under_review', 'pathway_published'];
export const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];
export const LANGUAGE_LEVELS = ['basic', 'intermediate', 'fluent', 'native'];
export const SKILL_CATEGORIES = ['technical', 'soft', 'digital', 'business', 'language', 'other'];
export const LEARNING_MODES = ['online', 'in_person', 'hybrid', 'any'];
export const BUDGET_RANGES = ['free', 'low', 'medium', 'high', 'employer_paid'];
export const REMARK_CATEGORIES = ['performance', 'potential', 'priority_skill', 'manager_note', 'other'];

/** One per student or employee — the core AI input (docs/03 §2). */
const learnerProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    learnerType: { type: String, enum: ['student', 'employee'], required: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' }, // employees only

    // Step 1 — personal
    phone: String,
    dateOfBirth: Date,
    gender: { type: String, enum: [...GENDERS, null] },
    country: String,
    city: String,
    languages: [{ _id: false, name: String, level: { type: String, enum: LANGUAGE_LEVELS } }],
    bio: { type: String, maxlength: 1000 },

    // Step 2 — education / study history
    education: [
      {
        institution: String,
        qualification: String,
        fieldOfStudy: String,
        startYear: Number,
        endYear: Number, // null = ongoing
        currentYearOfStudy: Number,
        grade: String,
        keyCourses: [String],
      },
    ],
    certifications: [{ name: String, issuer: String, year: Number, credentialUrl: String }],

    // Step 3 — employment (required for employees, optional for students)
    employment: {
      department: String,
      jobTitle: String,
      yearsInRole: Number,
      totalYearsExperience: Number,
      responsibilities: String,
      managesPeople: Boolean,
    },
    pastExperience: [{ company: String, title: String, startYear: Number, endYear: Number, summary: String }],

    // Step 4 — skills
    skills: [
      {
        name: String,
        category: { type: String, enum: SKILL_CATEGORIES },
        level: { type: Number, min: 1, max: 5 },
      },
    ],

    // Step 5 — interests and goals
    hobbies: [String],
    interests: [String],
    careerGoals: { shortTerm: String, longTerm: String, targetRoles: [String] },
    learningPreferences: {
      mode: { type: String, enum: LEARNING_MODES, default: 'any' },
      hoursPerWeek: Number,
      preferredLanguage: { type: String, enum: ['en', 'es', 'any'], default: 'any' },
      budgetRange: { type: String, enum: [...BUDGET_RANGES, null] },
      preferredStart: Date,
    },

    // Step 6 — CV
    cv: {
      url: String,
      publicId: String,
      fileName: String,
      uploadedAt: Date,
      extractedText: { type: String, select: false }, // AI only; capped at ~12k chars
    },

    // Org remarks (written by org_admin; employee sees read-only)
    orgRemarks: [
      {
        text: { type: String, required: true, maxlength: 2000 },
        category: { type: String, enum: REMARK_CATEGORIES, default: 'other' },
        author: { type: Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
        updatedAt: Date,
      },
    ],

    // Workflow
    completionPercent: { type: Number, default: 0 },
    status: { type: String, enum: PROFILE_STATUSES, default: 'draft' },
    submittedAt: Date,
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // self (student) or org_admin (employee)
  },
  { timestamps: true },
);

learnerProfileSchema.index({ organization: 1, status: 1 });
learnerProfileSchema.index({ learnerType: 1, status: 1 });

export const LearnerProfile = mongoose.models.LearnerProfile || mongoose.model('LearnerProfile', learnerProfileSchema);
export default LearnerProfile;
