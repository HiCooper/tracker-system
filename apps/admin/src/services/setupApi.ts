import api from './api';
import type { SpmApp, SpmPage, SpmBlock, SpmFunction } from '../types/spm';

export const setupApi = {
  // Apps
  listApps: () => api.get<SpmApp[]>('/v1/setup/apps').then((r) => r.data),
  createApp: (data: { appName: string; appCode: string; description?: string }) =>
    api.post<SpmApp>('/v1/setup/apps', data).then((r) => r.data),
  getApp: (id: number) => api.get<SpmApp>(`/v1/setup/apps/${id}`).then((r) => r.data),
  deleteApp: (id: number) => api.delete(`/v1/setup/apps/${id}`).then((r) => r.data),

  // Pages
  listPages: (appId: number) => api.get<SpmPage[]>(`/v1/setup/apps/${appId}/pages`).then((r) => r.data),
  createPage: (appId: number, data: { pageName: string; pageCode: string }) =>
    api.post<SpmPage>(`/v1/setup/apps/${appId}/pages`, data).then((r) => r.data),
  deletePage: (id: number) => api.delete(`/v1/setup/pages/${id}`).then((r) => r.data),

  // Blocks
  listBlocks: (pageId: number) => api.get<SpmBlock[]>(`/v1/setup/pages/${pageId}/blocks`).then((r) => r.data),
  createBlock: (pageId: number, data: { blockName: string; blockCode: string }) =>
    api.post<SpmBlock>(`/v1/setup/pages/${pageId}/blocks`, data).then((r) => r.data),
  deleteBlock: (id: number) => api.delete(`/v1/setup/blocks/${id}`).then((r) => r.data),

  // Functions
  listFunctions: (blockId: number) => api.get<SpmFunction[]>(`/v1/setup/blocks/${blockId}/functions`).then((r) => r.data),
  createFunction: (blockId: number, data: { funcName: string; funcCode: string }) =>
    api.post<SpmFunction>(`/v1/setup/blocks/${blockId}/functions`, data).then((r) => r.data),
  deleteFunction: (id: number) => api.delete(`/v1/setup/functions/${id}`).then((r) => r.data),
};
