import { create } from 'zustand';
import { analysisApi } from '../services/analysisApi';
import type { AppMetric, PageMetric, BlockMetric, FunctionMetric, TrendPoint, DayData } from '../types/analysis';
import dayjs from 'dayjs';

interface AnalysisState {
  // App level
  appMetrics: AppMetric[];

  // Page level
  pageTrend: TrendPoint[];
  pageSummary: Record<string, number> | null;
  pageMetrics: PageMetric[];

  // Block level
  blockTrend: TrendPoint[];
  blockSummary: Record<string, number> | null;
  blockMetrics: BlockMetric[];

  // Function level
  funcTrend: TrendPoint[];
  funcSummary: Record<string, number> | null;
  functionMetrics: FunctionMetric[];

  // Trend detail
  dayDetail: DayData[];

  loading: boolean;
  timeRange: { startTime: string; endTime: string };

  setTimeRange: (r: { startTime: string; endTime: string }) => void;
  fetchAppMetrics: () => Promise<void>;
  fetchPageMetrics: (appCode: string) => Promise<void>;
  fetchBlockMetrics: (appCode: string, pageCode: string) => Promise<void>;
  fetchFunctionMetrics: (appCode: string, pageCode: string, blockCode: string) => Promise<void>;
  fetchTrendDetail: (code: string, days: number) => Promise<void>;
}

const defaultRange = () => ({
  startTime: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
  endTime: dayjs().format('YYYY-MM-DD'),
});

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  appMetrics: [],
  pageTrend: [], pageSummary: null, pageMetrics: [],
  blockTrend: [], blockSummary: null, blockMetrics: [],
  funcTrend: [], funcSummary: null, functionMetrics: [],
  dayDetail: [],
  loading: false,
  timeRange: defaultRange(),

  setTimeRange: (r) => set({ timeRange: r }),

  fetchAppMetrics: async () => {
    set({ loading: true });
    const data = await analysisApi.getAppMetrics(get().timeRange);
    set({ appMetrics: data, loading: false });
  },

  fetchPageMetrics: async (appCode) => {
    set({ loading: true });
    const data = await analysisApi.getPageMetrics(appCode, get().timeRange);
    set({ pageTrend: data.trend, pageSummary: data.summary, pageMetrics: data.pages, loading: false });
  },

  fetchBlockMetrics: async (appCode, pageCode) => {
    set({ loading: true });
    const data = await analysisApi.getBlockMetrics(appCode, pageCode, get().timeRange);
    set({ blockTrend: data.trend, blockSummary: data.summary, blockMetrics: data.blocks, loading: false });
  },

  fetchFunctionMetrics: async (appCode, pageCode, blockCode) => {
    set({ loading: true });
    const data = await analysisApi.getFunctionMetrics(appCode, pageCode, blockCode, get().timeRange);
    set({ funcTrend: data.trend, funcSummary: data.summary, functionMetrics: data.functions, loading: false });
  },

  fetchTrendDetail: async (_code, days) => {
    set({ loading: true });
    const data = await analysisApi.getTrendDetail(_code, { days });
    set({ dayDetail: data.detail, loading: false });
  },
}));
