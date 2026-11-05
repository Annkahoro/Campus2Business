import { api, unwrap } from '../../lib/axios.js';

const clean = (params) =>
  Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const programmesApi = {
  // Catalogue (public / learner; admins also see drafts on detail)
  list: (params) => unwrap(api.get('/programmes', { params: clean(params) })),
  get: (id) => unwrap(api.get(`/programmes/${id}`)),
  categories: () => unwrap(api.get('/programmes/meta/categories')),

  // Admin
  adminList: (params) => unwrap(api.get('/admin/programmes', { params: clean(params) })),
  create: (body) => unwrap(api.post('/admin/programmes', body)),
  update: (id, body) => unwrap(api.patch(`/admin/programmes/${id}`, body)),
  setStatus: (id, status) => unwrap(api.patch(`/admin/programmes/${id}/status`, { status })),
  remove: (id) => unwrap(api.delete(`/admin/programmes/${id}`)),
  uploadCover: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return unwrap(api.post(`/admin/programmes/${id}/cover`, form));
  },
};
