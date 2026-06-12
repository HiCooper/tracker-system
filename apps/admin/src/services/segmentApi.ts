import api from './api';

export interface TagDef {
  id: string;
  name: string;
  type: 'rule' | 'computed';
  category: string;
  userCount: number;
  coveragePct: number;
  trend: 'up' | 'down' | 'stable';
  status: 'active' | 'paused';
  rule: string;
  updatedAt: string;
}

export interface CrowdDef {
  id: string;
  name: string;
  userCount: number;
  baseTags: string[];
  logic: 'AND' | 'OR';
  status: 'ready' | 'computing';
  desc: string;
  updatedAt: string;
}

export const segmentApi = {
  // Tags
  listTags: (params?: { search?: string; category?: string }) =>
    api.get<TagDef[]>('/v1/cdp/tags', { params }).then((r) => r.data),
  getTag: (id: string) => api.get<TagDef>(`/v1/cdp/tags/${id}`).then((r) => r.data),
  createTag: (data: Partial<TagDef>) => api.post<TagDef>('/v1/cdp/tags', data).then((r) => r.data),
  deleteTag: (id: string) => api.delete(`/v1/cdp/tags/${id}`).then((r) => r.data),

  // Crowds
  listCrowds: () => api.get<CrowdDef[]>('/v1/cdp/crowds').then((r) => r.data),
  createCrowd: (data: Partial<CrowdDef>) => api.post<CrowdDef>('/v1/cdp/crowds', data).then((r) => r.data),
  deleteCrowd: (id: string) => api.delete(`/v1/cdp/crowds/${id}`).then((r) => r.data),
};
