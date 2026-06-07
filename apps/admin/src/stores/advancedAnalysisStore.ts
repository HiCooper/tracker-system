import { create } from 'zustand';
import { advancedAnalysisApi } from '../services/advancedAnalysisApi';
import type {
  FunnelStep,
  FunnelTrendPoint,
  RetentionCohort,
  PathNode,
  PathTransition,
  TopPath,
} from '../types/advancedAnalysis';
import dayjs from 'dayjs';

interface AdvancedAnalysisState {
  // Funnel
  funnelSteps: FunnelStep[];
  funnelTrend: FunnelTrendPoint[];
  funnelOverallRate: number;
  funnelTotalEntrants: number;

  // Retention
  retentionCohorts: RetentionCohort[];
  retentionCurve: { day: number; rate: number }[];
  retentionSummary: {
    day1Rate: number;
    day7Rate: number;
    day30Rate: number;
    totalInitialUsers: number;
  } | null;

  // User Path
  pathNodes: PathNode[];
  pathTransitions: PathTransition[];
  pathTopPaths: TopPath[];
  pathSummary: { totalSessions: number; avgPathDepth: number } | null;

  loading: boolean;
  timeRange: { startTime: string; endTime: string };

  setTimeRange: (r: { startTime: string; endTime: string }) => void;
  fetchFunnel: (req: {
    steps: { stepName: string; eventType: string; eventFilter?: string }[];
    conversionWindowMinutes: number;
    platform?: string;
    appCode?: string;
  }) => Promise<void>;
  fetchRetention: (req: {
    initialEvent: string;
    returnEvent: string;
    retentionDays: number[];
    platform?: string;
    appCode?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) => Promise<void>;
  fetchPath: (req: {
    startPage?: string;
    positiveEvent?: string;
    depth: number;
    platform?: string;
    appCode?: string;
    minTransitionCount?: number;
  }) => Promise<void>;
}

const defaultRange = () => ({
  startTime: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
  endTime: dayjs().format('YYYY-MM-DD'),
});

export const useAdvancedAnalysisStore = create<AdvancedAnalysisState>((set, get) => ({
  funnelSteps: [],
  funnelTrend: [],
  funnelOverallRate: 0,
  funnelTotalEntrants: 0,

  retentionCohorts: [],
  retentionCurve: [],
  retentionSummary: null,

  pathNodes: [],
  pathTransitions: [],
  pathTopPaths: [],
  pathSummary: null,

  loading: false,
  timeRange: defaultRange(),

  setTimeRange: (r) => set({ timeRange: r }),

  fetchFunnel: async (req) => {
    set({ loading: true });
    const tr = get().timeRange;
    const data = await advancedAnalysisApi.analyzeFunnel({
      ...req,
      startTime: tr.startTime,
      endTime: tr.endTime,
    });
    set({
      funnelSteps: data.steps,
      funnelTrend: data.trend,
      funnelOverallRate: data.overallConversionRate,
      funnelTotalEntrants: data.totalEntrants,
      loading: false,
    });
  },

  fetchRetention: async (req) => {
    set({ loading: true });
    const tr = get().timeRange;
    const data = await advancedAnalysisApi.analyzeRetention({
      ...req,
      startTime: tr.startTime,
      endTime: tr.endTime,
    });
    set({
      retentionCohorts: data.cohorts,
      retentionCurve: data.retentionCurve,
      retentionSummary: data.summary,
      loading: false,
    });
  },

  fetchPath: async (req) => {
    set({ loading: true });
    const tr = get().timeRange;
    const data = await advancedAnalysisApi.analyzePath({
      ...req,
      startTime: tr.startTime,
      endTime: tr.endTime,
    });
    set({
      pathNodes: data.nodes,
      pathTransitions: data.transitions,
      pathTopPaths: data.topPaths,
      pathSummary: data.summary,
      loading: false,
    });
  },
}));
