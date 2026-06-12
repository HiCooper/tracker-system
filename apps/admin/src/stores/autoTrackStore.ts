import { create } from 'zustand';
import api from '../services/api';

export interface AutoElement {
  code: string; viewPath: string; tag: string; text: string;
  page: string; clicks: number; last24h: number;
  status: 'named' | 'unnamed'; customName?: string;
  className: string; inputType?: string;
}
export interface BackfillRecord {
  date: string; action: string; events: number; user: string; status: string;
}

interface AutoTrackState {
  elements: AutoElement[];
  backfillHistory: BackfillRecord[];
  backfillEnabled: boolean;
  loading: boolean;
  fetchElements: () => Promise<void>;
  fetchBackfillHistory: () => Promise<void>;
  setBackfillEnabled: (v: boolean) => void;
  nameElement: (code: string, name: string) => Promise<void>;
}

export const useAutoTrackStore = create<AutoTrackState>((set) => ({
  elements: [],
  backfillHistory: [],
  backfillEnabled: true,
  loading: false,

  fetchElements: async () => {
    set({ loading: true });
    const elements = await api.get<AutoElement[]>('/v1/engineering/autotrack/elements').then(r => r.data);
    set({ elements, loading: false });
  },

  fetchBackfillHistory: async () => {
    const backfillHistory = await api.get<BackfillRecord[]>('/v1/engineering/autotrack/backfill').then(r => r.data);
    set({ backfillHistory });
  },

  setBackfillEnabled: (v) => set({ backfillEnabled: v }),

  nameElement: async (code, name) => {
    await api.post(`/v1/engineering/autotrack/elements/${code}/name`, { name });
    set(s => ({ elements: s.elements.map(e => e.code === code ? { ...e, status: 'named' as const, customName: name } : e) }));
  },
}));
