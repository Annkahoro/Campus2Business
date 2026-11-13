import mongoose from 'mongoose';
import { Programme } from '../models/Programme.js';
import { ROLES } from '../models/_shared.js';
import { ApiError } from '../utils/ApiError.js';
import { getActiveFields, toFieldDTO } from './programmeField.service.js';
import { validateCustomFields } from './customFields.js';
import { deleteAsset, uploadImage } from './upload.service.js';
import { emitProgrammesChanged } from '../sockets/events.js';
import { assertCategoriesExist } from './category.service.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isAdminUser = (user) => user?.role === ROLES.C2B_ADMIN;
const mapToObject = (m) => (m instanceof Map ? Object.fromEntries(m) : { ...(m ?? {}) });
const i18nList = (v) => ({ en: [...(v?.en ?? [])], es: [...(v?.es ?? [])] });
const i18n = (v) => ({ en: v?.en ?? '', es: v?.es ?? '' });

/* ─────────────────────────── DTO ─────────────────────────── */

const prereqDTO = (p) =>
  p && typeof p === 'object' && p.title
    ? { id: String(p._id), code: p.code, title: p.title, status: p.status }
    : { id: String(p?._id ?? p) };

/**
 * `visibleKeys`: a Set of custom field keys the viewer may see (learners/public: showToLearners only).
 * Pass `null` for admins to get every stored value.
 */
export function toProgrammeDTO(p, { visibleKeys = null } = {}) {
  const custom = mapToObject(p.customFields);
  const customFields = visibleKeys
    ? Object.fromEntries(Object.entries(custom).filter(([k]) => visibleKeys.has(k)))
    : custom;

  return {
    id: String(p._id),
    code: p.code ?? null,
    title: p.title,
    shortDescription: p.shortDescription,
    description: p.description,
    coverImage: p.coverImage?.url ? { url: p.coverImage.url } : null,
    catalogue: p.catalogue ?? 'elearning',
    categories: p.categories ?? [],
    featured: !!p.featured,
    subsidised: !!p.subsidised,
    topics: i18nList(p.topics),
    idealFor: i18nList(p.idealFor),
    organizer: p.organizer || 'C2B',
    level: p.level,
    durationValue: p.durationValue ?? null,
    durationUnit: p.durationUnit ?? null,
    deliveryMode: p.deliveryMode ?? null,
    language: p.language ?? [],
    prerequisites: (p.prerequisites ?? []).map(prereqDTO),
    prerequisiteText: p.prerequisiteText,
    skillsGained: p.skillsGained ?? [],
    targetAudience: p.targetAudience ?? [],
    targetDepartments: p.targetDepartments ?? [],
    price: p.price ?? null,
    intakes: (p.intakes ?? []).map((i) => ({
      id: String(i._id),
      startDate: i.startDate,
      endDate: i.endDate ?? null,
      startTime: i.startTime ?? null,
      endTime: i.endTime ?? null,
      note: i18n(i.note),
      seats: i.seats ?? null,
      location: i.location ?? '',
    })),
    tags: p.tags ?? [],
    customFields,
    ...(visibleKeys ? {} : { sourceUrls: p.sourceUrls ?? [] }), // admins only
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/* ─────────────────────────── queries ─────────────────────────── */

function buildFilter(q) {
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.catalogue) filter.catalogue = q.catalogue;
  if (q.category) filter.categories = q.category;
  if (q.featured !== undefined) filter.featured = q.featured;
  if (q.subsidised !== undefined) filter.subsidised = q.subsidised;
  if (q.exclude) filter._id = { $ne: q.exclude };
  if (q.level) filter.level = q.level;
  if (q.mode) filter.deliveryMode = q.mode;
  if (q.lang) filter.language = q.lang;
  if (q.audience) filter.targetAudience = q.audience;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ 'title.en': rx }, { 'title.es': rx }, { code: rx }, { tags: rx }, { skillsGained: rx }];
  }
  return filter;
}

async function paginate(filter, { page, limit, all }, mapper) {
  const query = Programme.find(filter).sort({ featured: -1, catalogue: 1, 'title.es': 1 });
  if (all) {
    const items = await query.lean();
    return { items: items.map(mapper), page: 1, limit: items.length, total: items.length, pages: 1 };
  }
  const [items, total] = await Promise.all([
    query.skip((page - 1) * limit).limit(limit).lean(),
    Programme.countDocuments(filter),
  ]);
  return { items: items.map(mapper), page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

async function visibleKeysFor(user) {
  if (isAdminUser(user)) return null;
  const fields = await getActiveFields();
  return new Set(fields.filter((f) => f.showToLearners).map((f) => f.key));
}

/** GET /programmes — published only. */
export async function listPublished(query, user) {
  const visibleKeys = await visibleKeysFor(user);
  return paginate(buildFilter({ ...query, status: 'published' }), query, (p) => toProgrammeDTO(p, { visibleKeys }));
}

/**
 * GET /programmes/:id — published only, except admins can preview any status.
 * Returns the programme plus the field definitions needed to render its custom fields.
 */
export async function getForViewer(id, user) {
  const admin = isAdminUser(user);
  const programme = await Programme.findById(id).populate('prerequisites', 'code title status').lean();
  if (!programme || (!admin && programme.status !== 'published')) {
    throw ApiError.notFound('PROGRAMME_NOT_FOUND', 'Programme not found');
  }
  if (!admin) programme.prerequisites = programme.prerequisites.filter((p) => p.status === 'published');

  const fields = (await getActiveFields()).filter((f) => admin || f.showToLearners);
  const visibleKeys = admin ? null : new Set(fields.map((f) => f.key));
  return { programme: toProgrammeDTO(programme, { visibleKeys }), fields: fields.map(toFieldDTO) };
}

/** GET /admin/programmes — every status. */
export function adminList(query) {
  return paginate(buildFilter(query), query, (p) => toProgrammeDTO(p));
}

/* ─────────────────────────── writes ─────────────────────────── */

/** Prerequisites must exist, not include the programme itself, and not create a cycle. */
async function assertValidPrerequisites(programmeId, prereqIds) {
  if (!prereqIds?.length) return;
  const unique = [...new Set(prereqIds.map(String))];
  if (programmeId && unique.includes(String(programmeId))) {
    throw ApiError.badRequest('INVALID_PREREQUISITE', 'A programme cannot be its own prerequisite');
  }
  const count = await Programme.countDocuments({ _id: { $in: unique } });
  if (count !== unique.length) throw ApiError.badRequest('INVALID_PREREQUISITE', 'Unknown prerequisite programme');

  if (!programmeId) return; // a new programme cannot be anyone's prerequisite yet

  // Cycle check: walk the prerequisite graph from the new prerequisites; reaching programmeId = cycle.
  const all = await Programme.find({}, 'prerequisites').lean();
  const graph = new Map(all.map((p) => [String(p._id), (p.prerequisites ?? []).map(String)]));
  const target = String(programmeId);
  const stack = [...unique];
  const seen = new Set();
  while (stack.length) {
    const current = stack.pop();
    if (current === target) {
      throw ApiError.badRequest('PREREQUISITE_CYCLE', 'These prerequisites would create a cycle');
    }
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(graph.get(current) ?? []));
  }
}

const dedupe = (ids) => [...new Set((ids ?? []).map(String))];

export async function create(data, userId) {
  await assertCategoriesExist(data.categories);
  await assertValidPrerequisites(null, data.prerequisites);
  if (data.code && (await Programme.exists({ code: data.code }))) {
    throw ApiError.conflict('PROGRAMME_CODE_EXISTS', `Programme code ${data.code} already exists`);
  }
  const customFields = validateCustomFields(data.customFields ?? {}, {}, await getActiveFields());

  const programme = await Programme.create({
    ...data,
    prerequisites: dedupe(data.prerequisites),
    language: data.language ?? ['en', 'es'],
    targetAudience: data.targetAudience ?? ['student', 'employee'],
    status: data.status ?? 'draft',
    customFields,
    createdBy: userId,
  });
  emitProgrammesChanged(programme._id);
  return getForViewer(programme._id, { role: ROLES.C2B_ADMIN });
}

export async function update(id, data) {
  const programme = await Programme.findById(id);
  if (!programme) throw ApiError.notFound('PROGRAMME_NOT_FOUND', 'Programme not found');

  if (data.categories) await assertCategoriesExist(data.categories);
  if (data.prerequisites) {
    await assertValidPrerequisites(id, data.prerequisites);
    data.prerequisites = dedupe(data.prerequisites);
  }
  if (data.code && data.code !== programme.code && (await Programme.exists({ code: data.code }))) {
    throw ApiError.conflict('PROGRAMME_CODE_EXISTS', `Programme code ${data.code} already exists`);
  }

  const { customFields, ...rest } = data;
  programme.set(rest);
  if (customFields !== undefined) {
    programme.customFields = validateCustomFields(customFields, mapToObject(programme.customFields), await getActiveFields());
  }
  await programme.save();
  emitProgrammesChanged(programme._id);
  return getForViewer(programme._id, { role: ROLES.C2B_ADMIN });
}

export async function setStatus(id, status) {
  const programme = await Programme.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  if (!programme) throw ApiError.notFound('PROGRAMME_NOT_FOUND', 'Programme not found');
  emitProgrammesChanged(programme._id);
  return toProgrammeDTO(programme);
}

export async function uploadCover(id, file) {
  const programme = await Programme.findById(id);
  if (!programme) throw ApiError.notFound('PROGRAMME_NOT_FOUND', 'Programme not found');

  const uploaded = await uploadImage(file.buffer, 'programmes', 1600);
  const oldPublicId = programme.coverImage?.publicId;
  programme.coverImage = uploaded;
  await programme.save();
  if (oldPublicId && oldPublicId !== uploaded.publicId) await deleteAsset(oldPublicId);
  emitProgrammesChanged(programme._id);
  return toProgrammeDTO(programme);
}

/**
 * DELETE /admin/programmes/:id — archived (soft) if anyone has enrolled, otherwise removed
 * (and unlinked from other programmes' prerequisites).
 */
export async function remove(id) {
  const programme = await Programme.findById(id);
  if (!programme) throw ApiError.notFound('PROGRAMME_NOT_FOUND', 'Programme not found');

  const Enrollment = mongoose.models.Enrollment; // registered in Phase 7
  const hasEnrollments = Enrollment ? await Enrollment.exists({ programme: id }) : false;

  if (hasEnrollments) {
    programme.status = 'archived';
    await programme.save();
    emitProgrammesChanged(programme._id);
    return { archived: true, programme: toProgrammeDTO(programme) };
  }

  await Programme.updateMany({ prerequisites: id }, { $pull: { prerequisites: id } });
  await programme.deleteOne();
  await deleteAsset(programme.coverImage?.publicId);
  emitProgrammesChanged(id);
  return { archived: false, id: String(id) };
}
