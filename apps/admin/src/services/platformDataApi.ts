import api from './api';

export interface CoreMetrics {
  uv: number;
  sessions: number;
  pv: number;
  newUsers: number;
  avgDuration: number;
  avgDepth: number;
  bounceRate: number;
  conversionRate: number;
}

export interface ChannelBreakdown {
  name: string;
  uv: number;
  rank: number;
}

export interface PageBreakdown {
  name: string;
  pv: number;
  rank: number;
}

export interface RealtimeSnapshot {
  online: number;
  todayUv: number;
  todaySessions: number;
  todayNewUsers: number;
  topPages: { name: string; count: number }[];
}

export interface ChannelDetail {
  channel: string;
  uv: number;
  newUv: number;
  sessions: number;
  avgDuration: number;
  bounceRate: number;
}

export interface PageDetail {
  path: string;
  uv: number;
  pv: number;
  entry: number;
  exit: number;
  exitRate: number;
  avgStay: number;
}

export interface RetentionSummary {
  day1Rate: number;
  day7Rate: number;
  day30Rate: number;
  activeDay7Rate: number;
}

export interface CohortRow {
  date: string;
  users: number;
  rates: number[];
}

export interface AnomalyItem {
  metric: string;
  change: string;
  dir: 'up' | 'down';
  detail: string;
}

export interface AnalysisOverview {
  dau: number;
  mau: number;
  avgSessionsPerUser: number;
  avgDuration: number;
  avgPagesPerSession: number;
  day7Retention: number;
  channels: ChannelDetail[];
  pages: PageDetail[];
}

const BASE = '/v1/data-platform';

// 可选 appCode 过滤(空 = 全部 app);后端 events/sessions 均含 app_code 维度。
export const platformDataApi = {
  getCoreMetrics: (params: { startTime: string; endTime: string; appCode?: string }) =>
    api.get<CoreMetrics>(`${BASE}/core-metrics`, { params }).then((r) => r.data),

  getChannelBreakdown: (params: { startTime: string; endTime: string; appCode?: string }) =>
    api.get<ChannelBreakdown[]>(`${BASE}/channels`, { params }).then((r) => r.data),

  getPageBreakdown: (params: { startTime: string; endTime: string; appCode?: string }) =>
    api.get<PageBreakdown[]>(`${BASE}/pages`, { params }).then((r) => r.data),

  getRealtime: (params?: { appCode?: string }) =>
    api.get<RealtimeSnapshot>(`${BASE}/realtime`, { params }).then((r) => r.data),

  getAnalysisOverview: (params: { startTime: string; endTime: string; appCode?: string }) =>
    api.get<AnalysisOverview>(`${BASE}/analysis`, { params }).then((r) => r.data),

  getRetention: (params: { startTime: string; endTime: string; appCode?: string }) =>
    api.get<{ summary: RetentionSummary; cohorts: CohortRow[] }>(`${BASE}/retention`, { params }).then((r) => r.data),

  getAnomalies: (params: { date: string; appCode?: string }) =>
    api.get<AnomalyItem[]>(`${BASE}/anomalies`, { params }).then((r) => r.data),
};
