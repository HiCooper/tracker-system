import api from './api';
import type { AppMetric, PageAnalysisResult, BlockAnalysisResult, FunctionAnalysisResult, TrendDetailResult } from '../types/analysis';

export const analysisApi = {
  getAppMetrics: (params: { startTime: string; endTime: string }) =>
    api.post<AppMetric[]>('/v1/analysis/apps', params).then((r) => r.data),

  getPageMetrics: (appCode: string, params: { startTime: string; endTime: string }) =>
    api.post<PageAnalysisResult>(`/v1/analysis/apps/${appCode}/pages`, params).then((r) => r.data),

  getBlockMetrics: (appCode: string, pageCode: string, params: { startTime: string; endTime: string }) =>
    api.post<BlockAnalysisResult>(`/v1/analysis/apps/${appCode}/pages/${pageCode}/blocks`, params).then((r) => r.data),

  getFunctionMetrics: (appCode: string, pageCode: string, blockCode: string, params: { startTime: string; endTime: string }) =>
    api.post<FunctionAnalysisResult>(`/v1/analysis/apps/${appCode}/pages/${pageCode}/blocks/${blockCode}/functions`, params).then((r) => r.data),

  getTrendDetail: (_code: string, params: { days: number }) =>
    api.post<TrendDetailResult>('/v1/analysis/trend-detail', params).then((r) => r.data),
};
