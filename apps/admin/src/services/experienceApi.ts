import api from './api';

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
}

export interface HeatmapData {
  pageUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  totalClicks: number;
  points: HeatmapPoint[];
}

export interface HeatmapRequest {
  appCode: string;
  pageUrl: string;
  startTime: string;
  endTime: string;
  type: 'click' | 'exposure' | 'scroll';
  bucketSize?: number;
}

export interface PortraitDimension {
  label: string;
  value: string;
  count: number;
  percentage: number;
}

export interface UserPortrait {
  deviceType: PortraitDimension[];
  os: PortraitDimension[];
  browser: PortraitDimension[];
  language: PortraitDimension[];
  screenResolution: PortraitDimension[];
  source: PortraitDimension[];
  activeHours: { hour: number; dayOfWeek: number; count: number }[];
}

export interface PageListItem {
  pageUrl: string;
  pageTitle: string;
  pageViews: number;
}

export interface SessionRecord {
  id: string;
  user: string;
  device: string;
  os: string;
  pages: number;
  dur: string;
  ts: string;
}

export interface ConversionStep {
  step: string;
  users: number;
  rate: number;
}

export interface AnalysisReport {
  name: string;
  period: string;
  type: string;
  status: 'done' | 'running';
  ts: string;
}

const BASE = '/v1/experience';

export const experienceApi = {
  getHeatmap: (params: HeatmapRequest) =>
    api.get<HeatmapData>(`${BASE}/heatmap`, { params }).then((r) => r.data),

  getPortrait: (params: { appCode: string; startTime: string; endTime: string }) =>
    api.get<UserPortrait>(`${BASE}/portrait`, { params }).then((r) => r.data),

  listPages: (params: { appCode: string; startTime: string; endTime: string }) =>
    api.get<PageListItem[]>(`${BASE}/pages`, { params }).then((r) => r.data),

  listSessions: (params: { startTime: string; endTime: string }) =>
    api.get<SessionRecord[]>(`${BASE}/sessions`, { params }).then((r) => r.data),

  getConversion: (params: { startTime: string; endTime: string; goal?: string }) =>
    api.get<ConversionStep[]>(`${BASE}/conversion`, { params }).then((r) => r.data),

  listReports: () =>
    api.get<AnalysisReport[]>(`${BASE}/reports`).then((r) => r.data),
};
