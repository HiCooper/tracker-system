import api from './api';
import type { SpmVO, CreateSpmRequest, UpdateSpmRequest } from '../types/spm';
import type { PageData } from '../types/api';

export const spmApi = {
  list: (params: { page?: number; size?: number; keyword?: string } = {}) =>
    api.get<PageData<SpmVO>>('/v1/spm', { params }).then((r) => r.data),

  create: (data: CreateSpmRequest) =>
    api.post<SpmVO>('/v1/spm', data).then((r) => r.data),

  update: (id: number, data: UpdateSpmRequest) =>
    api.put<SpmVO>(`/v1/spm/${id}`, data).then((r) => r.data),

  remove: (id: number) =>
    api.delete(`/v1/spm/${id}`).then((r) => r.data),
};
