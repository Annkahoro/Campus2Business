import { api, unwrap } from '../../lib/axios.js';

export const authApi = {
  login: (body) => unwrap(api.post('/auth/login', body)),
  register: (body) => unwrap(api.post('/auth/register', body)),
  registerOrgAdmin: (body) => unwrap(api.post('/auth/register-org-admin', body)),
  registerEmployee: (body) => unwrap(api.post('/auth/register-employee', body)),
  google: (body) => unwrap(api.post('/auth/google', body)),
  me: () => unwrap(api.get('/auth/me')),
  updateMe: (body) => unwrap(api.patch('/auth/me', body)),
  changePassword: (body) => unwrap(api.patch('/auth/me/password', body)),
  deleteMe: (body) => unwrap(api.delete('/auth/me', { data: body })),
};
