import api from './api';
import type { TrackingPlan, CreatePlanRequest, UpdatePlanRequest, ReviewPlanRequest } from '../types/trackingPlan';
import type { PageData } from '../types/api';

export const planApi = {
  listPlans: (params?: { status?: string; page?: number; size?: number }) =>
    api.get<PageData<TrackingPlan>>('/v1/engineering/plans', { params }).then((r) => r.data),

  getPlan: (id: number) =>
    api.get<TrackingPlan>(`/v1/engineering/plans/${id}`).then((r) => r.data),

  createPlan: (data: CreatePlanRequest) =>
    api.post<TrackingPlan>('/v1/engineering/plans', data).then((r) => r.data),

  updatePlan: (id: number, data: UpdatePlanRequest) =>
    api.put<TrackingPlan>(`/v1/engineering/plans/${id}`, data).then((r) => r.data),

  deletePlan: (id: number) =>
    api.delete(`/v1/engineering/plans/${id}`).then((r) => r.data),

  submitForReview: (id: number) =>
    api.post<TrackingPlan>(`/v1/engineering/plans/${id}/submit`).then((r) => r.data),

  reviewPlan: (id: number, data: ReviewPlanRequest) =>
    api.post<TrackingPlan>(`/v1/engineering/plans/${id}/review`, data).then((r) => r.data),

  goOnline: (id: number) =>
    api.post<TrackingPlan>(`/v1/engineering/plans/${id}/online`).then((r) => r.data),
};
