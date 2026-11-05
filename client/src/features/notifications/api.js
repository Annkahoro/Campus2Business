import { api, unwrap } from '../../lib/axios.js';

export const notificationsApi = {
  list: (params) => unwrap(api.get('/notifications', { params })),
  markRead: (id) => unwrap(api.patch(`/notifications/${id}/read`)),
  markAllRead: () => unwrap(api.patch('/notifications/read-all')),
};
