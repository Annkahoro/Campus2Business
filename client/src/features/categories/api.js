import { api, unwrap } from '../../lib/axios.js';

/** Admin management of programme categories (public list lives in programmesApi.categories). */
export const categoriesApi = {
  adminList: () => unwrap(api.get('/admin/categories')),
  create: (body) => unwrap(api.post('/admin/categories', body)),
  update: (id, body) => unwrap(api.patch(`/admin/categories/${id}`, body)),
  reorder: (ids) => unwrap(api.patch('/admin/categories/reorder', { ids })),
  remove: (id) => unwrap(api.delete(`/admin/categories/${id}`)),
};
