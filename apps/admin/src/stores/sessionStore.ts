import { create } from 'zustand';
import { sessionApi } from '../services/sessionApi';
import type { SessionAnalysisRequest, SessionAnalysisResponse } from '../types/session';

interface SessionState {
  queryParams: SessionAnalysisRequest;
  result: SessionAnalysisResponse | null;
  loading: boolean;
  setQueryParams: (params: Partial<SessionAnalysisRequest>) => void;
  execute: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  queryParams: { startTime: '', endTime: '', interval: 'day' },
  result: null,
  loading: false,

  setQueryParams: (params) => {
    set((s) => ({ queryParams: { ...s.queryParams, ...params } }));
  },

  execute: async () => {
    const { queryParams } = get();
    set({ loading: true });
    try {
      const data = await sessionApi.analyzeSession(queryParams);
      set({ result: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
