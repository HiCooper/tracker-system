import { create } from 'zustand';
import { message } from 'antd';
import {
  platformDataApi,
  type CoreMetrics,
  type RealtimeSnapshot,
  type AnalysisOverview,
  type ChannelDetail,
  type PageDetail,
  type CohortRow,
  type AnomalyItem,
} from '../services/platformDataApi';

interface PlatformDataState {
  coreMetrics: CoreMetrics | null;
  channels: ChannelDetail[];
  pages: PageDetail[];
  realtime: RealtimeSnapshot | null;
  analysis: AnalysisOverview | null;
  retention: { summary: { day1Rate: number; day7Rate: number; day30Rate: number; activeDay7Rate: number }; cohorts: CohortRow[] } | null;
  anomalies: AnomalyItem[];
  loading: boolean;

  fetchCoreMetrics: (params: { startTime: string; endTime: string; appCode?: string }) => Promise<void>;
  fetchRealtime: (appCode?: string) => Promise<void>;
  fetchAnalysis: (params: { startTime: string; endTime: string; appCode?: string }) => Promise<void>;
  fetchRetention: (params: { startTime: string; endTime: string; appCode?: string }) => Promise<void>;
  fetchAnomalies: (params: { date: string; appCode?: string }) => Promise<void>;
}

export const usePlatformDataStore = create<PlatformDataState>((set) => ({
  coreMetrics: null,
  channels: [],
  pages: [],
  realtime: null,
  analysis: null,
  retention: null,
  anomalies: [],
  loading: false,

  fetchCoreMetrics: async (params) => {
    set({ loading: true });
    try {
      const coreMetrics = await platformDataApi.getCoreMetrics(params);
      set({ coreMetrics, loading: false });
    } catch {
      message.error({ content: '平台数据加载失败', key: 'platform-error' });
      set({ loading: false });
    }
  },

  fetchRealtime: async (appCode?: string) => {
    try {
      const realtime = await platformDataApi.getRealtime({ appCode });
      set({ realtime });
    } catch {
      /* 实时数据每 30s 轮询,失败时静默保留上次值,避免每 30s 弹错打扰 */
    }
  },

  fetchAnalysis: async (params) => {
    set({ loading: true });
    try {
      const analysis = await platformDataApi.getAnalysisOverview(params);
      set({ analysis, channels: analysis.channels, pages: analysis.pages, loading: false });
    } catch {
      message.error({ content: '平台数据加载失败', key: 'platform-error' });
      set({ loading: false });
    }
  },

  fetchRetention: async (params) => {
    set({ loading: true });
    try {
      const retention = await platformDataApi.getRetention(params);
      set({ retention, loading: false });
    } catch {
      message.error({ content: '平台数据加载失败', key: 'platform-error' });
      set({ loading: false });
    }
  },

  fetchAnomalies: async (params) => {
    try {
      const anomalies = await platformDataApi.getAnomalies(params);
      set({ anomalies });
    } catch {
      message.error({ content: '异动数据加载失败', key: 'platform-error' });
    }
  },
}));
