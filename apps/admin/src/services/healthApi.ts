import api from './api';

export interface HealthStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  components: Record<string, { status: string; latency?: number; detail?: string }>;
  uptime: string;
  version: string;
}

export interface AlertRule {
  id: number;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  channels: string[];
  createdAt: string;
}

export interface DataQualityReport {
  id: string;
  name: string;
  app: string;
  status: 'completed' | 'running';
  events: string[];
  results: { total: number; pass: number; fail: number; warn: number };
  duration: string;
  createdAt: string;
}

export const healthApi = {
  check: () => api.get<HealthStatus>('/v1/monitor/health').then((r) => r.data),
  metrics: () => api.get('/v1/monitor/metrics').then((r) => r.data),
  listAlertRules: () => api.get<AlertRule[]>('/v1/monitor/alerts/rules').then((r) => r.data),
  updateAlertRule: (id: number, data: Partial<AlertRule>) =>
    api.put<AlertRule>(`/v1/monitor/alerts/rules/${id}`, data).then((r) => r.data),
  listQualityReports: () => api.get<DataQualityReport[]>('/v1/monitor/quality/reports').then((r) => r.data),
  runQualityCheck: (events: string[]) =>
    api.post<DataQualityReport>('/v1/monitor/quality/run', { events }).then((r) => r.data),
};

// Extended types for HealthMonitorPage
export interface PerfMetricSummary {
  metric: string;
  p50: number;
  p75: number;
  p95: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface ErrorAggregation {
  fingerprint: string;
  message: string;
  source: string;
  count: number;
  affectedUsers: number;
  firstSeen: string;
  lastSeen: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ApiCallSummary {
  url: string;
  method: string;
  count: number;
  errorRate: number;
  p50Duration: number;
  p95Duration: number;
}

export interface PipelineHealth {
  eventsPerMinute: number;
  kafkaLag: number;
  dlqSize: number;
  dedupRate: number;
  clickhouseRows: number;
}

export interface HealthDashboard {
  perf: {
    lcp: PerfMetricSummary;
    fid: PerfMetricSummary;
    cls: PerfMetricSummary;
    pageLoad: PerfMetricSummary;
    trend: { timestamp: string; lcp: number }[];
  };
  errors: {
    total24h: number;
    errorRate: number;
    topErrors: ErrorAggregation[];
  };
  apiCalls: {
    totalCalls24h: number;
    overallErrorRate: number;
    topSlowEndpoints: ApiCallSummary[];
    topErrorEndpoints: ApiCallSummary[];
  };
  pipeline: PipelineHealth;
  dataQuality: {
    avgFieldNullRate: number;
    totalEventsToday: number;
    eventTypes: number;
  };
}

export const healthApiExtended = {
  getDashboard: (timeRangeHours: number) =>
    api.get<HealthDashboard>('/v1/monitor/dashboard', { params: { timeRange: timeRangeHours } }).then(r => r.data),
  getErrors: () =>
    api.get<ErrorAggregation[]>('/v1/monitor/errors').then(r => r.data),
  getApiCalls: (type: 'slow' | 'error') =>
    api.get<ApiCallSummary[]>('/v1/monitor/api-calls', { params: { type } }).then(r => r.data),
  getPipeline: () =>
    api.get<PipelineHealth>('/v1/monitor/pipeline').then(r => r.data),
};
