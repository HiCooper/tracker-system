import api from './api';
import type { SessionAnalysisRequest, SessionAnalysisResponse } from '../types/session';

export const sessionApi = {
  analyzeSession: (data: SessionAnalysisRequest) =>
    api.post<SessionAnalysisResponse>('/v1/analysis/session', data).then((r) => r.data),
};
