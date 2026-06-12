import { create } from 'zustand';
import api from '../services/api';

interface PlatformMetrics {
  pv: number; uv: number; newUsers: number;
  avgDuration: number; bounceRate: number;
  totalSessions: number; activeUsers: number;
}

interface TrendPoint {
  date: string; pv: number; uv: number;
  newUsers: number; activeUsers: number;
}

interface PlatformState {
  metrics: PlatformMetrics | null;
  trend: TrendPoint[];
  loading: boolean;

  fetchMetrics: (params?: { startDate?: string; endDate?: string }) => Promise<void>;
  fetchTrend: (params?: { startDate?: string; endDate?: string; granularity?: string }) => Promise<void>;
}

export const usePlatformStore = create<PlatformState>((set) => ({
  metrics: null,
  trend: [],
  loading: false,

  fetchMetrics: async () => {
    set({ loading: true });
    const metrics = await api.get<PlatformMetrics>('/v1/analytics/platform/metrics').then(r => r.data);
    set({ metrics, loading: false });
  },

  fetchTrend: async (params) => {
    set({ loading: true });
    const trend = await api.get<TrendPoint[]>('/v1/analytics/platform/trend', { params }).then(r => r.data);
    set({ trend, loading: false });
  },
}));
