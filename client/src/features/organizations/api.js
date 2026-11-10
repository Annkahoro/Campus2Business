import { api, unwrap } from '../../lib/axios.js';

const clean = (params) =>
  Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const orgApi = {
  // Org admin — own organization
  create: (body) => unwrap(api.post('/organizations', body)),
  mine: () => unwrap(api.get('/organizations/mine')),
  updateMine: (body) => unwrap(api.patch('/organizations/mine', body)),
  uploadLogo: (file) => {
    const form = new FormData();
    form.append('file', file);
    return unwrap(api.post('/organizations/mine/logo', form));
  },

  // C2B admin
  adminList: (params) => unwrap(api.get('/admin/organizations', { params: clean(params) })),
  adminGet: (id) => unwrap(api.get(`/admin/organizations/${id}`)),
  approve: (id) => unwrap(api.patch(`/admin/organizations/${id}/approve`)),
  reject: (id, reason) => unwrap(api.patch(`/admin/organizations/${id}/reject`, { reason })),
  suspend: (id) => unwrap(api.patch(`/admin/organizations/${id}/suspend`)),
  adminCreate: (body) => unwrap(api.post('/admin/organizations', body)),
  adminUpdate: (id, body) => unwrap(api.patch(`/admin/organizations/${id}`, body)),
  adminDelete: (id) => unwrap(api.delete(`/admin/organizations/${id}`)),

  // Invites
  validateInvite: (token) => unwrap(api.get(`/invites/${token}/validate`)),
  invites: () => unwrap(api.get('/org/invites')),
  createInvite: (body) => unwrap(api.post('/org/invites', body)),
  updateInvite: (id, body) => unwrap(api.patch(`/org/invites/${id}`, body)),
  regenerateInvite: (id) => unwrap(api.post(`/org/invites/${id}/regenerate`)),
  deleteInvite: (id) => unwrap(api.delete(`/org/invites/${id}`)),

  // Employees
  employees: (params) => unwrap(api.get('/org/employees', { params: clean(params) })),
  employee: (id) => unwrap(api.get(`/org/employees/${id}`)),
  addRemark: (id, body) => unwrap(api.post(`/org/employees/${id}/remarks`, body)),
  updateRemark: (id, remarkId, body) => unwrap(api.patch(`/org/employees/${id}/remarks/${remarkId}`, body)),
  deleteRemark: (id, remarkId) => unwrap(api.delete(`/org/employees/${id}/remarks/${remarkId}`)),
  submitEmployee: (id) => unwrap(api.post(`/org/employees/${id}/submit`)),
  submitBulk: (employeeIds) => unwrap(api.post('/org/employees/submit-bulk', { employeeIds })),
  deactivateEmployee: (id) => unwrap(api.patch(`/org/employees/${id}/deactivate`)),
  updateEmployee: (id, body) => unwrap(api.patch(`/org/employees/${id}`, body)),
  deleteEmployee: (id) => unwrap(api.delete(`/org/employees/${id}`)),
};
