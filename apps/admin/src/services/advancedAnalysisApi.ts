import api from './api';
import type {
  FunnelAnalysisRequest,
  FunnelAnalysisResult,
  RetentionAnalysisRequest,
  RetentionAnalysisResult,
  PathAnalysisRequest,
  PathAnalysisResult,
} from '../types/advancedAnalysis';

export const advancedAnalysisApi = {
  analyzeFunnel: (params: FunnelAnalysisRequest) =>
    api.post<FunnelAnalysisResult>('/v1/advanced-analysis/funnel', params).then((r) => r.data),

  analyzeRetention: (params: RetentionAnalysisRequest) =>
    api.post<RetentionAnalysisResult>('/v1/advanced-analysis/retention', params).then((r) => r.data),

  analyzePath: (params: PathAnalysisRequest) =>
    api.post<PathAnalysisResult>('/v1/advanced-analysis/path', params).then((r) => r.data),
};
