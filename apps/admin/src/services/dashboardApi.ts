import api from './api';

export interface DashboardVO {
  id: number;
  name: string;
  description?: string;
  configJson: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DashboardDataResult {
  dashboardId: number;
  name: string;
  panels: PanelData[];
}

export interface PanelData {
  panelId: string;
  type: string;
  title: string;
  result: unknown;
  error?: string;
}

export const dashboardApi = {
  list: () => api.get<DashboardVO[]>('/v1/dashboards').then((r) => r.data),

  get: (id: number) => api.get<DashboardVO>(`/v1/dashboards/${id}`).then((r) => r.data),

  getData: (id: number, params?: { startTime?: string; endTime?: string }) =>
    api.get<DashboardDataResult>(`/v1/dashboards/${id}/data`, { params }).then((r) => r.data),

  create: (data: { name: string; description?: string; configJson: string }) =>
    api.post<DashboardVO>('/v1/dashboards', data).then((r) => r.data),

  update: (id: number, data: { name?: string; description?: string; configJson?: string }) =>
    api.put<DashboardVO>(`/v1/dashboards/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/v1/dashboards/${id}`).then((r) => r.data),
};
