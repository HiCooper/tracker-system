import { create } from 'zustand';
import { behaviorApi, type EventSummary, type FunnelData, type PathData, type RetentionData } from '../services/behaviorApi';

interface BehaviorState {
  overview: { totalEvents: number; eventTypeCount: number; activeUsers: number; avgEventsPerUser: number } | null;
  events: EventSummary[];
  funnel: FunnelData | null;
  pathData: PathData | null;
  retention: RetentionData | null;
  loading: boolean;

  fetchOverview: (params: { startTime: string; endTime: string }) => Promise<void>;
  fetchEvents: (params: { startTime: string; endTime: string; eventTypes?: string[] }) => Promise<void>;
  fetchFunnel: (params: { startTime: string; endTime: string; steps?: string[] }) => Promise<void>;
  fetchPath: (params: { startTime: string; endTime: string; startPage?: string; depth?: number }) => Promise<void>;
  fetchRetention: (params: { startTime: string; endTime: string; initialEvent?: string; returnEvent?: string }) => Promise<void>;
}

export const useBehaviorStore = create<BehaviorState>((set) => ({
  overview: null,
  events: [],
  funnel: null,
  pathData: null,
  retention: null,
  loading: false,

  fetchOverview: async (params) => {
    set({ loading: true });
    try {
      const overview = await behaviorApi.getOverview(params);
      set({ overview, events: overview.topEvents, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchEvents: async (params) => {
    set({ loading: true });
    try {
      const events = await behaviorApi.getEvents(params);
      set({ events, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchFunnel: async (params) => {
    set({ loading: true });
    try {
      const funnel = await behaviorApi.getFunnel(params);
      set({ funnel, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchPath: async (params) => {
    set({ loading: true });
    try {
      const pathData = await behaviorApi.getPath(params);
      set({ pathData, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchRetention: async (params) => {
    set({ loading: true });
    try {
      const retention = await behaviorApi.getRetention(params);
      set({ retention, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
