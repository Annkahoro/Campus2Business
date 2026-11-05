import { ProgrammeField } from '../models/ProgrammeField.js';
import { ApiError } from '../utils/ApiError.js';

const needsOptions = (type) => type === 'select' || type === 'multiselect';

export const toFieldDTO = (f) => ({
  id: String(f._id),
  key: f.key,
  label: f.label,
  type: f.type,
  options: needsOptions(f.type) ? (f.options ?? []).map((o) => ({ value: o.value, label: o.label })) : [],
  required: f.required,
  helpText: f.helpText,
  showToLearners: f.showToLearners,
  useInAI: f.useInAI,
  order: f.order,
  isActive: f.isActive,
});

/** Active field definitions in display order (used for validation and rendering). */
export const getActiveFields = () => ProgrammeField.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();

/** GET /programme-fields — learners/public see only `showToLearners` fields. */
export async function listForRendering({ isAdmin }) {
  const fields = await getActiveFields();
  return fields.filter((f) => isAdmin || f.showToLearners).map(toFieldDTO);
}

/** GET /admin/programme-fields — all fields, active first. */
export async function listAll() {
  const fields = await ProgrammeField.find().sort({ isActive: -1, order: 1, createdAt: 1 }).lean();
  return fields.map(toFieldDTO);
}

export async function create(data) {
  if (await ProgrammeField.exists({ key: data.key })) {
    throw ApiError.conflict('FIELD_KEY_EXISTS', `A field with key "${data.key}" already exists`);
  }
  let { order } = data;
  if (order === undefined) {
    const last = await ProgrammeField.findOne().sort({ order: -1 }).select('order').lean();
    order = (last?.order ?? -1) + 1;
  }
  const field = await ProgrammeField.create({
    ...data,
    options: needsOptions(data.type) ? data.options : [],
    order,
  });
  return toFieldDTO(field);
}

export async function update(id, data) {
  const field = await ProgrammeField.findById(id);
  if (!field) throw ApiError.notFound('FIELD_NOT_FOUND', 'Programme field not found');

  const { options, ...rest } = data;
  field.set(rest);
  if (options !== undefined && needsOptions(field.type)) field.options = options;
  if (needsOptions(field.type) && field.options.length === 0) {
    throw ApiError.badRequest('OPTIONS_REQUIRED', 'Select fields need at least one option');
  }
  await field.save();
  return toFieldDTO(field);
}

/** PATCH /admin/programme-fields/reorder { ids } — order follows the array position. */
export async function reorder(ids) {
  const found = await ProgrammeField.countDocuments({ _id: { $in: ids } });
  if (found !== new Set(ids).size) throw ApiError.badRequest('FIELD_NOT_FOUND', 'Unknown field id in reorder list');
  await ProgrammeField.bulkWrite(
    ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: index } } } })),
  );
  return listAll();
}

/** DELETE → soft delete. Values already stored on programmes are kept. */
export async function deactivate(id) {
  const field = await ProgrammeField.findByIdAndUpdate(id, { isActive: false }, { new: true });
  if (!field) throw ApiError.notFound('FIELD_NOT_FOUND', 'Programme field not found');
  return toFieldDTO(field);
}
