import { api, unwrap } from '../../lib/axios.js';

const clean = (params) =>
  Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const enrollmentsApi = {
  // Learner (and org admin for request/pay)
  request: (body) => unwrap(api.post('/enrollments', body)),
  mine: () => unwrap(api.get('/enrollments/mine')),
  pay: (id, method) => unwrap(api.post(`/enrollments/${id}/pay`, { method })),
  rate: (id, body) => unwrap(api.post(`/enrollments/${id}/rate`, body)),

  // Org admin
  orgList: (params) => unwrap(api.get('/org/enrollments', { params: clean(params) })),

  // C2B admin
  adminList: (params) => unwrap(api.get('/admin/enrollments', { params: clean(params) })),
  setStatus: (id, body) => unwrap(api.patch(`/admin/enrollments/${id}/status`, body)),
  setProgress: (id, body) => unwrap(api.patch(`/admin/enrollments/${id}/progress`, body)),
  remove: (id) => unwrap(api.delete(`/admin/enrollments/${id}`)),
};
