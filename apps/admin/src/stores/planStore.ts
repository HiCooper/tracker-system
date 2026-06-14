import { create } from 'zustand';
import { message } from 'antd';
import { planApi } from '../services/planApi';
import type { TrackingPlan, CreatePlanRequest, UpdatePlanRequest, ReviewPlanRequest } from '../types/trackingPlan';

interface PlanState {
  plans: TrackingPlan[];
  currentPlan: TrackingPlan | null;
  loading: boolean;
  statusFilter: string;
  error: string | null;

  setStatusFilter: (s: string) => void;
  fetchPlans: (params?: { status?: string }) => Promise<void>;
  fetchPlan: (id: number) => Promise<void>;
  createPlan: (data: CreatePlanRequest) => Promise<TrackingPlan>;
  updatePlan: (id: number, data: UpdatePlanRequest) => Promise<void>;
  deletePlan: (id: number) => Promise<void>;
  submitForReview: (id: number) => Promise<void>;
  reviewPlan: (id: number, data: ReviewPlanRequest) => Promise<void>;
  goOnline: (id: number) => Promise<void>;
}

export const usePlanStore = create<PlanState>((set) => ({
  plans: [],
  currentPlan: null,
  loading: false,
  statusFilter: '',
  error: null,

  setStatusFilter: (statusFilter) => set({ statusFilter }),

  fetchPlans: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await planApi.listPlans(params);
      set({ plans: data.list, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || '加载失败' });
      message.error(err.message || '加载方案列表失败');
    }
  },

  fetchPlan: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await planApi.getPlan(id);
      set({ currentPlan: data, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || '加载失败' });
      message.error(err.message || '加载方案详情失败');
    }
  },

  createPlan: async (d) => {
    const data = await planApi.createPlan(d);
    return data;
  },

  updatePlan: async (id, d) => {
    const data = await planApi.updatePlan(id, d);
    set({ currentPlan: data });
  },

  deletePlan: async (id) => {
    await planApi.deletePlan(id);
    set((s) => ({ plans: s.plans.filter((p) => p.id !== id) }));
  },

  submitForReview: async (id) => {
    const data = await planApi.submitForReview(id);
    set({ currentPlan: data });
  },

  reviewPlan: async (id, d) => {
    const data = await planApi.reviewPlan(id, d);
    set({ currentPlan: data });
  },

  goOnline: async (id) => {
    const data = await planApi.goOnline(id);
    set({ currentPlan: data });
  },
}));
