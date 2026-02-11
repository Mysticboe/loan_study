import { request } from './http';

export const uploadIdCards = (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  return request({ method: 'POST', path: '/api/uploads/id-cards', body: formData });
};
