import api from './api';
import type { EventAnalysisRequest, EventAnalysisResponse } from '../types/analysis';

export const analysisApi = {
  analyzeEvents: (data: EventAnalysisRequest) =>
    api.post<EventAnalysisResponse>('/v1/analysis/events', data).then((r) => r.data),

  analyzeEventsRealtime: (data: EventAnalysisRequest) =>
    api.post<EventAnalysisResponse>('/v1/analysis/events/realtime', data).then((r) => r.data),
};
