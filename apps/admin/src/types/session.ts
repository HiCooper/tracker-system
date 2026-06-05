/** Session analysis request */
export interface SessionAnalysisRequest {
  groupBy?: string[];
  startTime: string;
  endTime: string;
  interval?: 'hour' | 'day';
}

/** Session analysis series */
export interface SessionSeries {
  name: string;
  groupValue: string;
  data: { time: string; value: number }[];
}

/** Session analysis summary */
export interface SessionSummary {
  sessionCount: number;
  userCount: number;
  avgDuration: number;
  avgPageDepth: number;
  bounceCount: number;
  bounceRate: number;
}

/** Session analysis response */
export interface SessionAnalysisResponse {
  interval: string;
  series: SessionSeries[];
  summary: SessionSummary;
}
