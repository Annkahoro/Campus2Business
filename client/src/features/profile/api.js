import { api, unwrap } from '../../lib/axios.js';

export const profileApi = {
  me: () => unwrap(api.get('/profile/me')),
  saveStep: (step, body) => unwrap(api.patch(`/profile/me/${step}`, body)),
  uploadCv: (file, onUploadProgress) => {
    const form = new FormData();
    form.append('file', file);
    return unwrap(api.post('/profile/me/cv', form, { onUploadProgress }));
  },
  deleteCv: () => unwrap(api.delete('/profile/me/cv')),
  submit: () => unwrap(api.post('/profile/me/submit')),
};

export const uploadAvatar = (file) => {
  const form = new FormData();
  form.append('file', file);
  return unwrap(api.post('/auth/me/avatar', form));
};
