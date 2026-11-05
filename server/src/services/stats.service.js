import { Programme } from '../models/Programme.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { Enrollment } from '../models/Enrollment.js';
import { ROLES } from '../models/_shared.js';

/**
 * Public, anonymous counts for the landing page stats band (docs/09 §Landing 6).
 * Cached for 5 minutes so the landing page never hammers the database.
 */
const TTL_MS = 5 * 60 * 1000;
let cache = { at: 0, data: null };

export async function publicStats() {
  if (cache.data && Date.now() - cache.at < TTL_MS) return cache.data;
  const [programmes, learners, organizations, completions] = await Promise.all([
    Programme.countDocuments({ status: 'published' }),
    User.countDocuments({ role: { $in: [ROLES.STUDENT, ROLES.EMPLOYEE] }, isActive: true }),
    Organization.countDocuments({ status: 'approved' }),
    Enrollment.countDocuments({ status: 'completed' }),
  ]);
  cache = { at: Date.now(), data: { programmes, learners, organizations, completions } };
  return cache.data;
}
