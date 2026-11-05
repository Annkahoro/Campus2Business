import digitalTransformation from '../../assets/images/photos/digital-transformation.webp';
import mentorSession from '../../assets/images/photos/mentor-session.webp';
import organizationTeam from '../../assets/images/photos/organization-team.webp';
import studentsCampus from '../../assets/images/photos/students-campus.webp';
import heroLearning from '../../assets/images/photos/hero-learning.webp';
import employeeUpskilling from '../../assets/images/photos/employee-upskilling.webp';

export const CATEGORIES = [
  'digital_transformation',
  'data_ai',
  'cloud',
  'cybersecurity',
  'agile_pm',
  'leadership_change',
  'finance',
  'hr_people',
  'marketing_ecommerce',
  'soft_skills',
];
export const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
export const MODES = ['online', 'in_person', 'hybrid'];
export const DURATION_UNITS = ['hours', 'days', 'weeks', 'months'];
export const AUDIENCES = ['student', 'employee'];
export const PROGRAMME_STATUSES = ['draft', 'published', 'archived'];
export const CONTENT_LANGS = ['en', 'es'];

/**
 * Fallback cover per category when a programme has no uploaded cover.
 * TODO Phase 9: replace with the dedicated cat-*.webp images from docs/13.
 */
const CATEGORY_IMAGES = {
  digital_transformation: digitalTransformation,
  data_ai: digitalTransformation,
  cloud: digitalTransformation,
  cybersecurity: digitalTransformation,
  agile_pm: organizationTeam,
  leadership_change: mentorSession,
  finance: employeeUpskilling,
  hr_people: organizationTeam,
  marketing_ecommerce: heroLearning,
  soft_skills: studentsCampus,
};

export const coverFor = (programme) =>
  programme?.coverImage?.url || CATEGORY_IMAGES[programme?.category] || digitalTransformation;
