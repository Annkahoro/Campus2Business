import { api, unwrap } from '../../lib/axios.js';

const clean = (params) =>
  Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const recommendationsApi = {
  // C2B admin — learners
  learners: (params) => unwrap(api.get('/admin/learners', { params: clean(params) })),
  learner: (userId) => unwrap(api.get(`/admin/learners/${userId}`)),

  // C2B admin — recommendations
  list: (params) => unwrap(api.get('/admin/recommendations', { params: clean(params) })),
  get: (id) => unwrap(api.get(`/admin/recommendations/${id}`)),
  generate: (userId) => unwrap(api.post(`/admin/recommendations/generate/${userId}`)),
  generateBulk: (userIds) => unwrap(api.post('/admin/recommendations/generate-bulk', { userIds })),
  update: (id, body) => unwrap(api.patch(`/admin/recommendations/${id}`, body)),
  approve: (id) => unwrap(api.post(`/admin/recommendations/${id}/approve`)),
  publish: (id) => unwrap(api.post(`/admin/recommendations/${id}/publish`)),
  reject: (id, reason) => unwrap(api.post(`/admin/recommendations/${id}/reject`, { reason })),
  translate: (id) => unwrap(api.post(`/admin/recommendations/${id}/translate`)),

  // Learner
  mine: () => unwrap(api.get('/profile/me/recommendation')),
  feedback: (body) => unwrap(api.post('/profile/me/recommendation/feedback', body)),
};
