import { create } from 'zustand';
import { dashboardApi } from '../services/dashboardApi';
import type { DashboardVO, CreateDashboardRequest } from '../types/dashboard';

interface DashboardState {
  dashboards: DashboardVO[];
  currentDashboard: DashboardVO | null;
  loading: boolean;
  fetchList: () => Promise<void>;
  fetchById: (id: number) => Promise<void>;
  create: (data: CreateDashboardRequest) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  currentDashboard: null,
  loading: false,

  fetchList: async () => {
    set({ loading: true });
    try {
      const data = await dashboardApi.list();
      set({ dashboards: data.list, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchById: async (id: number) => {
    set({ loading: true });
    try {
      const data = await dashboardApi.getById(id);
      set({ currentDashboard: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  create: async (data: CreateDashboardRequest) => {
    await dashboardApi.create(data);
    await get().fetchList();
  },

  remove: async (id: number) => {
    await dashboardApi.remove(id);
    await get().fetchList();
  },
}));
