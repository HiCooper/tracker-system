import { create } from 'zustand';
import { analysisApi } from '../services/analysisApi';
import type { EventAnalysisRequest, EventAnalysisResponse } from '../types/analysis';

interface AnalysisState {
  queryParams: EventAnalysisRequest;
  result: EventAnalysisResponse | null;
  loading: boolean;
  chartType: 'line' | 'bar';
  setChartType: (t: 'line' | 'bar') => void;
  setQueryParams: (params: Partial<EventAnalysisRequest>) => void;
  execute: () => Promise<void>;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  queryParams: {
    eventTypes: [],
    startTime: '',
    endTime: '',
    interval: 'day',
    groupBy: ['event_type'],
  },
  result: null,
  loading: false,
  chartType: 'line',

  setChartType: (chartType) => set({ chartType }),

  setQueryParams: (params) => {
    set((s) => ({ queryParams: { ...s.queryParams, ...params } }));
  },

  execute: async () => {
    const { queryParams } = get();
    set({ loading: true });
    try {
      const data = await analysisApi.analyzeEvents(queryParams);
      set({ result: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
