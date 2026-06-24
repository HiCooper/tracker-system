import { create } from 'zustand';
import { message } from 'antd';
import { experienceApi, type HeatmapData, type HeatmapRequest, type UserPortrait, type PageListItem, type SessionRecord, type ConversionStep, type AnalysisReport } from '../services/experienceApi';

interface ExperienceState {
  heatmapData: HeatmapData | null;
  heatmapLoading: boolean;
  portrait: UserPortrait | null;
  portraitLoading: boolean;
  pages: PageListItem[];
  pagesLoading: boolean;
  sessions: SessionRecord[];
  sessionsLoading: boolean;
  conversion: ConversionStep[];
  conversionLoading: boolean;
  reports: AnalysisReport[];
  reportsLoading: boolean;

  fetchHeatmap: (params: HeatmapRequest) => Promise<void>;
  fetchPortrait: (params: { appCode: string; startTime: string; endTime: string }) => Promise<void>;
  fetchPages: (params: { appCode: string; startTime: string; endTime: string }) => Promise<void>;
  fetchSessions: (params: { startTime: string; endTime: string }) => Promise<void>;
  fetchConversion: (params: { startTime: string; endTime: string; goal?: string }) => Promise<void>;
  fetchReports: () => Promise<void>;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  heatmapData: null,
  heatmapLoading: false,
  portrait: null,
  portraitLoading: false,
  pages: [],
  pagesLoading: false,
  sessions: [],
  sessionsLoading: false,
  conversion: [],
  conversionLoading: false,
  reports: [],
  reportsLoading: false,

  fetchHeatmap: async (params) => {
    set({ heatmapLoading: true });
    try {
      const data = await experienceApi.getHeatmap(params);
      set({ heatmapData: data, heatmapLoading: false });
    } catch {
      message.error({ content: '体验分析数据加载失败', key: 'experience-error' });
      set({ heatmapLoading: false });
    }
  },

  fetchPortrait: async (params) => {
    set({ portraitLoading: true });
    try {
      const data = await experienceApi.getPortrait(params);
      set({ portrait: data, portraitLoading: false });
    } catch {
      message.error({ content: '体验分析数据加载失败', key: 'experience-error' });
      set({ portraitLoading: false });
    }
  },

  fetchPages: async (params) => {
    set({ pagesLoading: true });
    try {
      const pages = await experienceApi.listPages(params);
      set({ pages, pagesLoading: false });
    } catch {
      message.error({ content: '体验分析数据加载失败', key: 'experience-error' });
      set({ pagesLoading: false });
    }
  },

  fetchSessions: async (params) => {
    set({ sessionsLoading: true });
    try {
      const sessions = await experienceApi.listSessions(params);
      set({ sessions, sessionsLoading: false });
    } catch {
      message.error({ content: '体验分析数据加载失败', key: 'experience-error' });
      set({ sessionsLoading: false });
    }
  },

  fetchConversion: async (params) => {
    set({ conversionLoading: true });
    try {
      const conversion = await experienceApi.getConversion(params);
      set({ conversion, conversionLoading: false });
    } catch {
      message.error({ content: '体验分析数据加载失败', key: 'experience-error' });
      set({ conversionLoading: false });
    }
  },

  fetchReports: async () => {
    set({ reportsLoading: true });
    try {
      const reports = await experienceApi.listReports();
      set({ reports, reportsLoading: false });
    } catch {
      message.error({ content: '体验分析数据加载失败', key: 'experience-error' });
      set({ reportsLoading: false });
    }
  },
}));
