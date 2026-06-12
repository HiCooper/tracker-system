import { create } from 'zustand';
import { dashboardApi, type DashboardVO, type DashboardDataResult } from '../services/dashboardApi';

interface DashboardState {
  dashboards: DashboardVO[];
  currentDashboard: DashboardVO | null;
  dashboardData: DashboardDataResult | null;
  loading: boolean;

  fetchList: () => Promise<void>;
  fetchOne: (id: number) => Promise<void>;
  fetchData: (id: number, startTime?: string, endTime?: string) => Promise<void>;
  create: (data: { name: string; description?: string; configJson: string }) => Promise<void>;
  update: (id: number, data: { name?: string; description?: string; configJson?: string }) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  dashboards: [],
  currentDashboard: null,
  dashboardData: null,
  loading: false,

  fetchList: async () => {
    set({ loading: true });
    const data = await dashboardApi.list();
    set({ dashboards: data, loading: false });
  },

  fetchOne: async (id) => {
    set({ loading: true });
    const data = await dashboardApi.get(id);
    set({ currentDashboard: data, loading: false });
  },

  fetchData: async (id, startTime, endTime) => {
    set({ loading: true });
    const data = await dashboardApi.getData(id, { startTime, endTime });
    set({ dashboardData: data, loading: false });
  },

  create: async (d) => {
    await dashboardApi.create(d);
  },

  update: async (id, d) => {
    const data = await dashboardApi.update(id, d);
    set({ currentDashboard: data });
  },

  remove: async (id) => {
    await dashboardApi.delete(id);
    set((s) => ({ dashboards: s.dashboards.filter((d) => d.id !== id) }));
  },
}));
