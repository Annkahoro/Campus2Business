import { Category } from '../models/Category.js';
import { Programme } from '../models/Programme.js';
import { ApiError } from '../utils/ApiError.js';
import { emitProgrammesChanged } from '../sockets/events.js';

export const toCategoryDTO = (c, counts) => ({
  id: String(c._id),
  slug: c.slug,
  name: { en: c.name?.en ?? '', es: c.name?.es ?? '' },
  order: c.order,
  isActive: c.isActive,
  ...(counts ? { counts } : {}),
});

/** { slug: { elearning, general, total } } for programmes matching `match`. */
async function countBySlug(match) {
  const rows = await Programme.aggregate([
    { $match: match },
    { $unwind: '$categories' },
    { $group: { _id: { slug: '$categories', catalogue: '$catalogue' }, n: { $sum: 1 } } },
  ]);
  const out = {};
  for (const { _id, n } of rows) {
    out[_id.slug] ??= { elearning: 0, general: 0, total: 0 };
    out[_id.slug][_id.catalogue] = n;
    out[_id.slug].total += n;
  }
  return out;
}

const EMPTY = { elearning: 0, general: 0, total: 0 };

/**
 * GET /programmes/meta/categories — active categories in display order, with the number of published
 * programmes per catalogue (the catalogue page hides chips with no programmes in the selected catalogue).
 */
export async function listPublic() {
  const [categories, counts] = await Promise.all([
    Category.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean(),
    countBySlug({ status: 'published' }),
  ]);
  return categories.map((c) => toCategoryDTO(c, counts[c.slug] ?? EMPTY));
}

/** GET /admin/categories — every category (active first) with counts over all non-archived programmes. */
export async function listAll() {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ isActive: -1, order: 1, createdAt: 1 }).lean(),
    countBySlug({ status: { $ne: 'archived' } }),
  ]);
  return categories.map((c) => toCategoryDTO(c, counts[c.slug] ?? EMPTY));
}

/** Throws INVALID_CATEGORY when any slug is not an existing category. */
export async function assertCategoriesExist(slugs) {
  if (!slugs?.length) return;
  const found = await Category.countDocuments({ slug: { $in: slugs } });
  if (found !== new Set(slugs).size) throw ApiError.badRequest('INVALID_CATEGORY', 'Unknown category');
}

export async function create(data) {
  if (await Category.exists({ slug: data.slug })) {
    throw ApiError.conflict('CATEGORY_SLUG_EXISTS', `A category with slug "${data.slug}" already exists`);
  }
  const last = await Category.findOne().sort({ order: -1 }).select('order').lean();
  const category = await Category.create({ ...data, order: (last?.order ?? -1) + 1 });
  emitProgrammesChanged(null);
  return toCategoryDTO(category, EMPTY);
}

export async function update(id, data) {
  const category = await Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!category) throw ApiError.notFound('CATEGORY_NOT_FOUND', 'Category not found');
  emitProgrammesChanged(null);
  return toCategoryDTO(category);
}

/** PATCH /admin/categories/reorder { ids } — order follows the array position. */
export async function reorder(ids) {
  const found = await Category.countDocuments({ _id: { $in: ids } });
  if (found !== new Set(ids).size) throw ApiError.badRequest('CATEGORY_NOT_FOUND', 'Unknown category id in reorder list');
  await Category.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: index } } } })));
  emitProgrammesChanged(null);
  return listAll();
}

/**
 * DELETE /admin/categories/:id — removed when no programme uses it; otherwise deactivated (hidden from
 * filters and the programme form, but existing programmes keep the label).
 */
export async function remove(id) {
  const category = await Category.findById(id);
  if (!category) throw ApiError.notFound('CATEGORY_NOT_FOUND', 'Category not found');
  const inUse = await Programme.exists({ categories: category.slug });
  if (inUse) {
    category.isActive = false;
    await category.save();
  } else {
    await category.deleteOne();
  }
  emitProgrammesChanged(null);
  return { deactivated: !!inUse, id: String(category._id) };
}
