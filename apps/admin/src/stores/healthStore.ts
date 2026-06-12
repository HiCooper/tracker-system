import { create } from 'zustand';
import { healthApi, healthApiExtended, type HealthStatus, type AlertRule, type DataQualityReport, type HealthDashboard } from '../services/healthApi';

interface HealthState {
  status: HealthStatus | null;
  alerts: AlertRule[];
  qualityReports: DataQualityReport[];
  dashboard: HealthDashboard | null;
  loading: boolean;

  fetchHealth: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  updateAlert: (id: number, data: Partial<AlertRule>) => Promise<void>;
  fetchQualityReports: () => Promise<void>;
  runQualityCheck: (events: string[]) => Promise<void>;
  fetchDashboard: (timeRangeHours: number) => Promise<void>;
}

export const useHealthStore = create<HealthState>((set) => ({
  status: null,
  alerts: [],
  qualityReports: [],
  dashboard: null,
  loading: false,

  fetchHealth: async () => {
    try {
      const status = await healthApi.check();
      set({ status });
    } catch { /* keep previous state */ }
  },

  fetchAlerts: async () => {
    const alerts = await healthApi.listAlertRules();
    set({ alerts });
  },

  updateAlert: async (id, data) => {
    const updated = await healthApi.updateAlertRule(id, data);
    set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? updated : a)) }));
  },

  fetchQualityReports: async () => {
    const qualityReports = await healthApi.listQualityReports();
    set({ qualityReports });
  },

  runQualityCheck: async (events) => {
    const report = await healthApi.runQualityCheck(events);
    set((s) => ({ qualityReports: [report, ...s.qualityReports] }));
  },

  fetchDashboard: async (timeRangeHours) => {
    set({ loading: true });
    const dashboard = await healthApiExtended.getDashboard(timeRangeHours);
    set({ dashboard, loading: false });
  },
}));
