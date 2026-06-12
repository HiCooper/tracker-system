import api from './api';

export interface EventSummary {
  eventType: string;
  count: number;
  users: number;
  avgPerUser: number;
  trend: number;
}

export interface FunnelStep {
  step: string;
  users: number;
  rate: number;
}

export interface FunnelData {
  steps: FunnelStep[];
  totalEntered: number;
  overallConversionRate: number;
  maxDropStep: string;
  medianConversionMinutes: number;
}

export interface PathNode {
  page: string;
  sessions: number;
  percentage: number;
}

export interface PathTransition {
  from: string;
  to: string;
  count: number;
}

export interface PathData {
  nodes: PathNode[];
  transitions: PathTransition[];
  totalSessions: number;
  avgDepth: number;
  pageCount: number;
}

export interface BehaviorOverview {
  totalEvents: number;
  eventTypeCount: number;
  activeUsers: number;
  avgEventsPerUser: number;
  topEvents: EventSummary[];
}

export interface RetentionCohort {
  date: string;
  users: number;
  rates: number[];
}

export interface RetentionData {
  cohorts: RetentionCohort[];
  day2Rate: number;
  day7Rate: number;
  day30Rate: number;
}

const BASE = '/v1/behavior';

export const behaviorApi = {
  getOverview: (params: { startTime: string; endTime: string }) =>
    api.get<BehaviorOverview>(`${BASE}/overview`, { params }).then((r) => r.data),

  getEvents: (params: { startTime: string; endTime: string; eventTypes?: string[] }) =>
    api.get<EventSummary[]>(`${BASE}/events`, { params }).then((r) => r.data),

  getFunnel: (params: { startTime: string; endTime: string; steps?: string[] }) =>
    api.get<FunnelData>(`${BASE}/funnel`, { params }).then((r) => r.data),

  getPath: (params: { startTime: string; endTime: string; startPage?: string; depth?: number }) =>
    api.get<PathData>(`${BASE}/path`, { params }).then((r) => r.data),

  getRetention: (params: { startTime: string; endTime: string; initialEvent?: string; returnEvent?: string }) =>
    api.get<RetentionData>(`${BASE}/retention`, { params }).then((r) => r.data),
};
