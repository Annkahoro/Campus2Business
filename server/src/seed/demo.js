/**
 * Demo data (docs/12 "Demo seed data"). Development only: `npm run seed:demo`.
 * Idempotent: an account that already exists is left alone. Passwords: Demo1234! (development only).
 *
 * Besides the demo accounts it creates "peer" learners with completed enrollments, so the AI's
 * historical signals ("learners like you…") have real patterns to show.
 */
import { User } from '../models/User.js';
import { LearnerProfile } from '../models/LearnerProfile.js';
import { Organization } from '../models/Organization.js';
import { InviteLink } from '../models/InviteLink.js';
import { Programme } from '../models/Programme.js';
import { Enrollment } from '../models/Enrollment.js';
import { ROLES } from '../models/_shared.js';
import { randomToken } from '../utils/tokens.js';
import { computeCompletion } from '../services/profile.service.js';

const PASSWORD = 'Demo1234!';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);

async function ensureUser({ email, name, role, organization }) {
  const existing = await User.findOne({ email });
  if (existing) return { user: existing, created: false };
  const user = await User.create({ email, name, role, organization, password: PASSWORD, authProvider: 'local' });
  return { user, created: true };
}

async function ensureProfile(user, data) {
  const exists = await LearnerProfile.findOne({ user: user._id });
  if (exists) return exists;
  const profile = new LearnerProfile({
    user: user._id,
    learnerType: user.role === ROLES.EMPLOYEE ? 'employee' : 'student',
    organization: user.organization ?? undefined,
    ...data,
  });
  profile.completionPercent = computeCompletion(profile.toObject()).percent;
  await profile.save();
  return profile;
}

async function ensureOrg(owner, data) {
  let org = await Organization.findOne({ owner: owner._id });
  if (!org) {
    org = await Organization.create({ ...data, owner: owner._id, slug: `${data.slug}-${randomToken(5).toLowerCase()}` });
    if (org.status === 'approved') {
      await InviteLink.create({ organization: org._id, token: randomToken(24), label: 'Default', createdBy: owner._id });
    }
  }
  if (!owner.organization) {
    owner.organization = org._id;
    await owner.save();
  }
  return org;
}

/** Completed enrollments in order: [[code, score, daysAgoCompleted], …] */
async function ensureHistory(user, steps, idByCode) {
  if (await Enrollment.exists({ learner: user._id })) return 0;
  let n = 0;
  for (const [code, score, ago] of steps) {
    const programme = idByCode.get(code);
    if (!programme) continue;
    await Enrollment.create({
      learner: user._id,
      programme: programme._id,
      organization: user.role === ROLES.EMPLOYEE ? user.organization : undefined,
      status: 'completed',
      requestedBy: user._id,
      payment: {
        simulated: true,
        amount: programme.price?.amount ?? 0,
        currency: programme.price?.currency ?? 'EUR',
        method: user.role === ROLES.EMPLOYEE ? 'employer_invoice' : 'card',
        status: 'paid',
        reference: `SIM-${randomToken(6).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}`,
        paidAt: daysAgo(ago + 60),
      },
      progressPercent: 100,
      startedAt: daysAgo(ago + 45),
      completedAt: daysAgo(ago),
      score,
      learnerRating: score >= 80 ? 5 : 4,
    });
    n += 1;
  }
  return n;
}

const english = [{ name: 'English', level: 'fluent' }];

export async function seedDemo() {
  const programmes = await Programme.find({}, 'code price').lean();
  const idByCode = new Map(programmes.map((p) => [p.code, p]));
  let created = 0;
  let enrollments = 0;

  /* ── Student: Amina (submitted, ready for a pathway) ── */
  {
    const { user, created: c } = await ensureUser({ email: 'amina.student@demo.com', name: 'Amina Wanjiru', role: ROLES.STUDENT });
    created += c ? 1 : 0;
    await ensureProfile(user, {
      country: 'Kenya',
      city: 'Nairobi',
      languages: [...english, { name: 'Swahili', level: 'native' }, { name: 'Spanish', level: 'basic' }],
      bio: 'Third-year computer science student who enjoys turning messy data into clear insights.',
      education: [
        {
          institution: 'University of Nairobi',
          qualification: 'BSc',
          fieldOfStudy: 'Computer Science',
          startYear: 2023,
          currentYearOfStudy: 3,
          keyCourses: ['Statistics', 'Databases', 'Programming in Python'],
        },
      ],
      skills: [
        { name: 'Python', category: 'technical', level: 3 },
        { name: 'Excel', category: 'digital', level: 4 },
        { name: 'SQL', category: 'technical', level: 2 },
        { name: 'Presentation', category: 'soft', level: 3 },
      ],
      interests: ['Data visualisation', 'Fintech'],
      careerGoals: { shortTerm: 'Get a junior data analyst internship', longTerm: 'Become a data analyst in fintech', targetRoles: ['Data analyst'] },
      learningPreferences: { mode: 'online', hoursPerWeek: 8, preferredLanguage: 'any', budgetRange: 'low' },
      status: 'submitted',
      submittedAt: daysAgo(1),
    });
  }

  /* ── Acme Bank (approved) + HR admin ── */
  const { user: hr, created: hrc } = await ensureUser({ email: 'hr@acmebank.demo', name: 'Acme HR', role: ROLES.ORG_ADMIN });
  created += hrc ? 1 : 0;
  const acme = await ensureOrg(hr, {
    name: 'Acme Bank',
    slug: 'acme-bank',
    industry: 'Banking',
    size: '201-500',
    country: 'Kenya',
    city: 'Nairobi',
    website: 'https://acmebank.demo',
    contactPerson: { name: 'Mary Otieno', email: 'hr@acmebank.demo', position: 'Head of HR' },
    description: 'A mid-sized retail bank moving its core systems to the cloud and growing digital channels.',
    departments: [{ name: 'ICT', headcount: 45 }, { name: 'Finance', headcount: 30 }, { name: 'HR', headcount: 12 }],
    goals: ['Move core banking systems to the cloud', 'Launch a mobile-first digital bank'],
    objectives: ['Certify 20 ICT staff in cloud by year end', 'Data-driven finance reporting'],
    skillGaps: ['Cloud', 'Cybersecurity', 'Data analytics', 'Change management'],
    trainingBudget: 'medium',
    digitalMaturity: 3,
    status: 'approved',
    reviewedAt: daysAgo(30),
  });

  /* ── John (ICT, goal cloud architect, 2 completed programmes) ── */
  {
    const { user, created: c } = await ensureUser({ email: 'john.ict@acmebank.demo', name: 'John Kamau', role: ROLES.EMPLOYEE, organization: acme._id });
    created += c ? 1 : 0;
    await ensureProfile(user, {
      country: 'Kenya',
      city: 'Nairobi',
      languages: english,
      bio: 'Systems engineer running the core banking Linux servers; keen to lead our cloud migration.',
      education: [{ institution: 'JKUAT', qualification: 'BSc', fieldOfStudy: 'Information Technology', startYear: 2012, endYear: 2016 }],
      employment: {
        department: 'ICT',
        jobTitle: 'Senior Systems Engineer',
        yearsInRole: 3,
        totalYearsExperience: 8,
        responsibilities: 'Core banking infrastructure, Linux servers, backups and on-call support.',
        managesPeople: false,
      },
      skills: [
        { name: 'Linux', category: 'technical', level: 4 },
        { name: 'AWS', category: 'technical', level: 2 },
        { name: 'Networking', category: 'technical', level: 3 },
        { name: 'Scrum', category: 'business', level: 3 },
      ],
      interests: ['Cloud', 'Automation'],
      careerGoals: { shortTerm: 'AWS Solutions Architect certification', longTerm: 'Cloud architect', targetRoles: ['Cloud architect'] },
      learningPreferences: { mode: 'hybrid', hoursPerWeek: 5, preferredLanguage: 'en', budgetRange: 'employer_paid' },
      orgRemarks: [
        { text: 'Strong potential to lead the cloud migration; should strengthen security fundamentals.', category: 'potential', author: hr._id, createdAt: daysAgo(5) },
      ],
      status: 'submitted',
      submittedAt: daysAgo(2),
      submittedBy: hr._id,
    });
    enrollments += await ensureHistory(user, [['C2B-AG-101', 84, 200], ['C2B-CL-101', 88, 90]], idByCode);
  }

  /* ── Grace (Finance, goal digital finance lead, remarks) ── */
  {
    const { user, created: c } = await ensureUser({ email: 'grace.finance@acmebank.demo', name: 'Grace Achieng', role: ROLES.EMPLOYEE, organization: acme._id });
    created += c ? 1 : 0;
    await ensureProfile(user, {
      country: 'Kenya',
      city: 'Nairobi',
      languages: english,
      bio: 'Finance analyst preparing monthly management reports; wants to modernise our reporting.',
      education: [{ institution: 'Strathmore University', qualification: 'BCom', fieldOfStudy: 'Finance', startYear: 2014, endYear: 2018 }],
      employment: {
        department: 'Finance',
        jobTitle: 'Finance Analyst',
        yearsInRole: 4,
        totalYearsExperience: 6,
        responsibilities: 'Monthly management accounts, budgeting support and variance analysis in Excel.',
        managesPeople: false,
      },
      skills: [
        { name: 'Excel', category: 'digital', level: 5 },
        { name: 'Financial reporting', category: 'business', level: 4 },
        { name: 'Power BI', category: 'digital', level: 1 },
      ],
      interests: ['Fintech', 'Automation'],
      careerGoals: { shortTerm: 'Automate monthly reporting with dashboards', longTerm: 'Digital finance lead', targetRoles: ['Digital finance lead'] },
      learningPreferences: { mode: 'online', hoursPerWeek: 4, preferredLanguage: 'any', budgetRange: 'employer_paid' },
      orgRemarks: [
        { text: 'Priority: lead the move from spreadsheets to automated dashboards in Finance.', category: 'priority_skill', author: hr._id, createdAt: daysAgo(4) },
        { text: 'Excellent attention to detail; ready for more responsibility.', category: 'performance', author: hr._id, createdAt: daysAgo(4) },
      ],
      status: 'submitted',
      submittedAt: daysAgo(2),
      submittedBy: hr._id,
    });
  }

  /* ── Sunrise Logistics (pending — to demo approval live) ── */
  {
    const { user, created: c } = await ensureUser({ email: 'sunrise@demo.com', name: 'Sunrise Admin', role: ROLES.ORG_ADMIN });
    created += c ? 1 : 0;
    await ensureOrg(user, {
      name: 'Sunrise Logistics',
      slug: 'sunrise-logistics',
      industry: 'Logistics',
      size: '51-200',
      country: 'Kenya',
      city: 'Mombasa',
      description: 'Regional logistics company digitising fleet and warehouse operations.',
      departments: [{ name: 'Operations', headcount: 80 }, { name: 'ICT', headcount: 8 }],
      goals: ['Digitise warehouse operations'],
      skillGaps: ['Data analytics', 'Digital transformation'],
      digitalMaturity: 2,
      status: 'pending',
    });
  }

  /* ── Peers with history (feed historical signals) ── */
  const ictPaths = [
    [['C2B-CL-101', 82, 300], ['C2B-CL-201', 78, 200]],
    [['C2B-CL-101', 90, 280], ['C2B-CL-201', 85, 150]],
    [['C2B-CL-101', 75, 260], ['C2B-CY-101', 88, 170]],
    [['C2B-AG-101', 80, 320], ['C2B-CL-101', 86, 220], ['C2B-CL-201', 81, 100]],
    [['C2B-CL-101', 88, 240], ['C2B-CL-201', 90, 120]],
    [['C2B-CY-101', 79, 230], ['C2B-CL-101', 83, 140]],
  ];
  const financePaths = [
    [['C2B-DA-101', 85, 300], ['C2B-FN-101', 88, 220], ['C2B-FN-201', 82, 120]],
    [['C2B-FN-101', 80, 280], ['C2B-DA-101', 84, 190], ['C2B-DA-201', 79, 90]],
    [['C2B-DA-101', 90, 250], ['C2B-DA-201', 86, 140]],
    [['C2B-FN-101', 77, 210], ['C2B-FN-201', 81, 110]],
  ];
  const studentPaths = [
    [['C2B-DA-101', 88, 260], ['C2B-DA-201', 84, 150]],
    [['C2B-DA-101', 79, 240], ['C2B-DA-201', 80, 130], ['C2B-DA-301', 76, 40]],
    [['C2B-SS-101', 90, 220], ['C2B-DA-101', 85, 120]],
  ];

  const peer = async (email, name, role, profile, path) => {
    const { user, created: c } = await ensureUser({ email, name, role, organization: role === ROLES.EMPLOYEE ? acme._id : undefined });
    created += c ? 1 : 0;
    await ensureProfile(user, { country: 'Kenya', city: 'Nairobi', languages: english, status: 'complete', ...profile });
    enrollments += await ensureHistory(user, path, idByCode);
  };

  for (const [i, path] of ictPaths.entries()) {
    await peer(`peer.ict${i + 1}@acmebank.demo`, `ICT Peer ${i + 1}`, ROLES.EMPLOYEE, { employment: { department: 'ICT', jobTitle: 'Engineer' } }, path);
  }
  for (const [i, path] of financePaths.entries()) {
    await peer(`peer.finance${i + 1}@acmebank.demo`, `Finance Peer ${i + 1}`, ROLES.EMPLOYEE, { employment: { department: 'Finance', jobTitle: 'Analyst' } }, path);
  }
  for (const [i, path] of studentPaths.entries()) {
    await peer(`peer.student${i + 1}@demo.com`, `Student Peer ${i + 1}`, ROLES.STUDENT, { education: [{ institution: 'University of Nairobi', qualification: 'BSc', fieldOfStudy: 'Computer Science' }] }, path);
  }

  console.log(`✅ Demo data: ${created} accounts created, ${enrollments} completed enrollments added (password ${PASSWORD})`);
}
