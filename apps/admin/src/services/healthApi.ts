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

// ── 监控仪表盘类型(与后端 MonitorController /dashboard 的真实契约对齐)──
// 后端对无采集来源的板块显式返回 {available:false, reason},前端据此降级展示而非编造数值。

/** 无采集来源的板块标记(Web Vitals 性能、API 调用统计)。 */
export interface UnavailableSection {
  available: false;
  reason: string;
}

/** 采集管道状态。无来源的字段(kafkaLag、未上报的 dlq/dedup)为 null。 */
export interface PipelineHealth {
  clickhouseRows: number | null;
  eventsPerMinute: number | null;
  available: boolean;
  dlqSize: number | null;
  dedupRate: number | null;
  collectorMetricsAvailable: boolean;
  kafkaLag: number | null;
}

/** 数据质量(直查 ClickHouse)。CH 不可达时 available=false 且各值为 null。 */
export interface DataQualityHealth {
  totalEventsToday: number | null;
  eventTypes: number | null;
  avgFieldNullRate: number | null;
  available: boolean;
}

/** 最近的 error 事件(真实明细)。 */
export interface RecentErrorEvent {
  eventId: string;
  pageUrl: string;
  properties: string;
  timestamp: string;
}

export interface HealthDashboard {
  perf: UnavailableSection;
  apiCalls: UnavailableSection;
  errors: { recent: RecentErrorEvent[] };
  pipeline: PipelineHealth;
  dataQuality: DataQualityHealth;
}

export const healthApiExtended = {
  getDashboard: (timeRangeHours: number) =>
    api.get<HealthDashboard>('/v1/monitor/dashboard', { params: { timeRange: timeRangeHours } }).then(r => r.data),
  getErrors: (limit = 50) =>
    api.get<RecentErrorEvent[]>('/v1/monitor/errors', { params: { limit } }).then(r => r.data),
  getPipeline: () =>
    api.get<PipelineHealth>('/v1/monitor/pipeline').then(r => r.data),
};
