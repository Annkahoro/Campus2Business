import { api, unwrap } from '../../lib/axios.js';

export const programmeFieldsApi = {
  /** Active definitions for rendering (non-admins get showToLearners only). */
  listForRendering: () => unwrap(api.get('/programme-fields')),
  adminList: () => unwrap(api.get('/admin/programme-fields')),
  create: (body) => unwrap(api.post('/admin/programme-fields', body)),
  update: (id, body) => unwrap(api.patch(`/admin/programme-fields/${id}`, body)),
  reorder: (ids) => unwrap(api.patch('/admin/programme-fields/reorder', { ids })),
  deactivate: (id) => unwrap(api.delete(`/admin/programme-fields/${id}`)),
};
