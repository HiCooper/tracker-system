import api from './api';
import type { DashboardVO, CreateDashboardRequest, UpdateDashboardRequest } from '../types/dashboard';
import type { PageData } from '../types/api';

export const dashboardApi = {
  list: (params: { page?: number; size?: number } = {}) =>
    api.get<PageData<DashboardVO>>('/v1/dashboards', { params }).then((r) => r.data),

  getById: (id: number) =>
    api.get<DashboardVO>(`/v1/dashboards/${id}`).then((r) => r.data),

  create: (data: CreateDashboardRequest) =>
    api.post<DashboardVO>('/v1/dashboards', data).then((r) => r.data),

  update: (id: number, data: UpdateDashboardRequest) =>
    api.put<DashboardVO>(`/v1/dashboards/${id}`, data).then((r) => r.data),

  remove: (id: number) =>
    api.delete(`/v1/dashboards/${id}`).then((r) => r.data),
};
