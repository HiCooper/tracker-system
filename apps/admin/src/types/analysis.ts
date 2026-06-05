/** Metric aggregation type */
export type AggType = 'uniq' | 'count' | 'sum' | 'avg';

/** Filter operator */
export type FilterOperator =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'contains' | 'not_contains' | 'is_null' | 'is_not_null' | 'in';

/** Time interval */
export type TimeInterval = 'hour' | 'day' | 'week' | 'month';

/** Metric query */
export interface MetricQuery {
  aggType: AggType;
  field?: string;
  preset?: string;
}

/** Filter condition */
export interface FilterCondition {
  key: string;
  operator: FilterOperator;
  value?: unknown;
}

/** Event analysis request */
export interface EventAnalysisRequest {
  eventTypes?: string[];
  metrics?: MetricQuery[];
  groupBy?: string[];
  filters?: FilterCondition[];
  startTime: string;
  endTime: string;
  interval?: TimeInterval;
}

/** Data point in a series */
export interface DataPoint {
  time: string;
  value: number;
}

/** Chart series */
export interface ChartSeries {
  name: string;
  eventType: string;
  data: DataPoint[];
}

/** Event analysis response */
export interface EventAnalysisResponse {
  interval: string;
  series: ChartSeries[];
  tableData: Record<string, unknown>[];
}
