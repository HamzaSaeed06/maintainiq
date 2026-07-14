import api from './api';

export const assetService = {
  create: (data) => api.post('/assets', data),
  getAll: (params) => api.get('/assets', { params }),
  getById: (id) => api.get(`/assets/${id}`),
  update: (id, data) => api.patch(`/assets/${id}`, data),
  getQR: (id) => api.get(`/assets/${id}/qr`),
  getHistory: (id) => api.get(`/assets/${id}/history`),
};
