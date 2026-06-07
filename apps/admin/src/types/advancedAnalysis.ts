// ============ Funnel Analysis ============

export interface FunnelStepDef {
  stepName: string;
  eventType: string;
  eventFilter?: string;
}

export interface FunnelStep {
  stepIndex: number;
  stepName: string;
  eventType: string;
  eventFilter?: string;
  count: number;
  users: number;
  conversionRate: number;
  stepConversionRate: number;
  medianDurationSec: number;
}

export interface FunnelTrendPoint {
  date: string;
  steps: { stepIndex: number; count: number; conversionRate: number }[];
}

export interface FunnelAnalysisRequest {
  steps: FunnelStepDef[];
  startTime: string;
  endTime: string;
  conversionWindowMinutes: number;
  platform?: string;
  appCode?: string;
}

export interface FunnelAnalysisResult {
  steps: FunnelStep[];
  overallConversionRate: number;
  totalEntrants: number;
  trend: FunnelTrendPoint[];
}

// ============ Retention Analysis ============

export interface RetentionCohort {
  cohortDate: string;
  initialUsers: number;
  retentionRates: Record<string, number>;
  retentionCounts: Record<string, number>;
}

export interface RetentionAnalysisRequest {
  initialEvent: string;
  returnEvent: string;
  startTime: string;
  endTime: string;
  retentionDays: number[];
  platform?: string;
  appCode?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface RetentionAnalysisResult {
  cohorts: RetentionCohort[];
  retentionCurve: { day: number; rate: number }[];
  summary: {
    day1Rate: number;
    day7Rate: number;
    day30Rate: number;
    totalInitialUsers: number;
  };
}

// ============ User Path Analysis ============

export interface PathTransition {
  source: string;
  target: string;
  count: number;
  rate: number;
}

export interface PathNode {
  name: string;
  value: number;
  depth: number;
}

export interface TopPath {
  path: string[];
  count: number;
  users: number;
  rate: number;
}

export interface PathAnalysisRequest {
  startPage?: string;
  positiveEvent?: string;
  depth: number;
  startTime: string;
  endTime: string;
  platform?: string;
  appCode?: string;
  minTransitionCount?: number;
}

export interface PathAnalysisResult {
  nodes: PathNode[];
  transitions: PathTransition[];
  topPaths: TopPath[];
  summary: {
    totalSessions: number;
    avgPathDepth: number;
  };
}
