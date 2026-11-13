import digitalTransformation from '../../assets/images/photos/digital-transformation.webp';
import mentorSession from '../../assets/images/photos/mentor-session.webp';
import organizationTeam from '../../assets/images/photos/organization-team.webp';
import studentsCampus from '../../assets/images/photos/students-campus.webp';
import heroLearning from '../../assets/images/photos/hero-learning.webp';
import employeeUpskilling from '../../assets/images/photos/employee-upskilling.webp';

/**
 * The two C2B catalogues (mirrors campus2b.com):
 * - elearning: self-paced online courses, start any time
 * - general:   scheduled courses with fixed dates (training calendar)
 */
export const CATALOGUES = ['elearning', 'general'];
export const LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
export const MODES = ['online', 'in_person', 'hybrid'];
export const DURATION_UNITS = ['hours', 'days', 'weeks', 'months'];
export const AUDIENCES = ['student', 'employee'];
export const PROGRAMME_STATUSES = ['draft', 'published', 'archived'];
export const CONTENT_LANGS = ['en', 'es'];

/** Public C2B training contact shown on programme pages (same as campus2b.com). */
export const C2B_CONTACT = { email: 'formacion@campus2b.com', phone: '+34 944 395 655' };

/**
 * Fallback cover per category (first category = primary) when a programme has no uploaded cover.
 * TODO Phase 9: replace with the dedicated cat-*.webp images from docs/13.
 */
const CATEGORY_IMAGES = {
  artificial_intelligence: digitalTransformation,
  cybersecurity: digitalTransformation,
  infrastructure_systems: digitalTransformation,
  programming: digitalTransformation,
  databases: digitalTransformation,
  digital_transformation: digitalTransformation,
  user_technologies: employeeUpskilling,
  office_tools: employeeUpskilling,
  office_365: employeeUpskilling,
  microsoft: employeeUpskilling,
  automation: employeeUpskilling,
  project_management: organizationTeam,
  itil: organizationTeam,
  istqb: organizationTeam,
  personal_competencies: mentorSession,
  social_media: heroLearning,
  soft_skills: studentsCampus,
};

export const coverFor = (programme) =>
  programme?.coverImage?.url || CATEGORY_IMAGES[programme?.categories?.[0]] || digitalTransformation;
