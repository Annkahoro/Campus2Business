import { Enrollment } from '../../models/Enrollment.js';
import { LearnerProfile } from '../../models/LearnerProfile.js';
import { Programme } from '../../models/Programme.js';

/**
 * "Learners like you…" (docs/06 §4).
 * Peer group: same department (employees) or same field of study (students).
 * From their completed enrollments, in completedAt order:
 *  - transitions: after completing a programme this learner also completed, what did peers complete next?
 *  - most completed programmes in the peer group.
 */

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (s) => new RegExp(`^${escapeRegex(s.trim())}$`, 'i');

function peerFilter(profile) {
  if (profile.learnerType === 'employee') {
    const department = profile.employment?.department?.trim();
    return department ? { label: department, filter: { learnerType: 'employee', 'employment.department': exact(department) } } : null;
  }
  const fields = [...new Set((profile.education ?? []).map((e) => e.fieldOfStudy?.trim()).filter(Boolean))];
  return fields.length
    ? { label: fields[0], filter: { learnerType: 'student', 'education.fieldOfStudy': { $in: fields.map(exact) } } }
    : null;
}

/**
 * @param profile   the learner's LearnerProfile (lean or doc)
 * @param completedIds  Set<string> of programme IDs this learner completed
 * @returns { text, transitions, mostCompleted }
 */
export async function getHistoricalSignals(profile, completedIds) {
  const empty = { text: 'No historical data yet.', transitions: [], mostCompleted: [] };
  const peers = peerFilter(profile);
  if (!peers) return empty;

  const peerUsers = await LearnerProfile.find({ ...peers.filter, user: { $ne: profile.user } }, 'user').lean();
  if (peerUsers.length === 0) return empty;

  // One row per peer: completed programmes in completion order.
  const sequences = await Enrollment.aggregate([
    { $match: { status: 'completed', learner: { $in: peerUsers.map((p) => p.user) } } },
    { $sort: { completedAt: 1 } },
    { $group: { _id: '$learner', steps: { $push: { programme: '$programme', score: '$score' } } } },
  ]);
  if (sequences.length === 0) return empty;

  const transitions = new Map(); // "from>to" → { from, to, count, scores[] }
  const totals = new Map(); // programme → count
  for (const { steps } of sequences) {
    steps.forEach((step, i) => {
      const id = String(step.programme);
      totals.set(id, (totals.get(id) ?? 0) + 1);
      const prev = steps[i - 1];
      if (!prev) return;
      const from = String(prev.programme);
      if (!completedIds.has(from) || completedIds.has(id)) return;
      const key = `${from}>${id}`;
      const t = transitions.get(key) ?? { from, to: id, count: 0, scores: [] };
      t.count += 1;
      if (typeof step.score === 'number') t.scores.push(step.score);
      transitions.set(key, t);
    });
  }

  const topTransitions = [...transitions.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const topCompleted = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  const ids = new Set([...topTransitions.flatMap((t) => [t.from, t.to]), ...topCompleted.map(([id]) => id)]);
  const programmes = await Programme.find({ _id: { $in: [...ids] } }, 'title code').lean();
  const title = new Map(programmes.map((p) => [String(p._id), p.title?.en || p.code || String(p._id)]));

  const group = (n) =>
    profile.learnerType === 'employee'
      ? `${n === 1 ? 'learner' : 'learners'} in ${peers.label}`
      : `${peers.label} ${n === 1 ? 'student' : 'students'}`;
  const lines = topTransitions.map((t) => {
    const avg = t.scores.length ? ` (avg score ${Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length)})` : '';
    return `- ${t.count} ${group(t.count)} who completed "${title.get(t.from)}" next completed "${title.get(t.to)}"${avg}.`;
  });
  if (topCompleted.length) {
    const who = profile.learnerType === 'employee' ? `${peers.label} employees` : `${peers.label} students`;
    lines.push(`- Most completed by ${who}: ${topCompleted.map(([id, n]) => `"${title.get(id)}" (${n})`).join(', ')}.`);
  }

  return {
    text: lines.length ? lines.join('\n') : empty.text,
    transitions: topTransitions.map(({ from, to, count }) => ({ from, to, count })),
    mostCompleted: topCompleted.map(([id, count]) => ({ programme: id, count })),
  };
}
