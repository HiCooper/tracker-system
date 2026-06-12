import { create } from 'zustand';
import api from '../services/api';

export interface SchemaAttr { name: string; type: string; required: boolean; desc: string; enum?: string[]; range?: { min: number; max: number }; }
export interface EventSchema { id: string; eventType: string; description: string; required: boolean; status: string; attributes: SchemaAttr[]; }
export interface VerifyReport { id: string; name: string; app: string; status: string; events: string[]; results: { total: number; pass: number; fail: number; warn: number }; duration: string; createdAt: string; }
export interface VerifyFailure { eventType: string; attr: string; expected: string; actual: string; error: string; severity: string; detail: string; }

interface VerifyState {
  schemas: EventSchema[];
  reports: VerifyReport[];
  failures: VerifyFailure[];
  running: boolean;
  result: VerifyReport | null;
  loading: boolean;
  fetchSchemas: () => Promise<void>;
  fetchReports: () => Promise<void>;
  runVerification: (events: string[]) => Promise<void>;
}

export const useVerifyStore = create<VerifyState>((set) => ({
  schemas: [],
  reports: [],
  failures: [],
  running: false,
  result: null,
  loading: false,

  fetchSchemas: async () => {
    set({ loading: true });
    try {
      const schemas = await api.get<EventSchema[]>('/v1/engineering/verify/schemas').then(r => r.data);
      set({ schemas, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchReports: async () => {
    try {
      const reports = await api.get<VerifyReport[]>('/v1/monitor/quality/reports').then(r => r.data);
      set({ reports });
    } catch {
      /* keep previous state */
    }
  },

  runVerification: async (events) => {
    set({ running: true, result: null });
    try {
      const result = await api.post<VerifyReport>('/v1/monitor/quality/run', { events }).then(r => r.data);
      const failures = await api.get<VerifyFailure[]>('/v1/monitor/quality/failures').then(r => r.data);
      set({ running: false, result, failures });
    } catch {
      set({ running: false });
    }
  },
}));
