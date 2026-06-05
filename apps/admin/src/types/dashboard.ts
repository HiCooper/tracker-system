/** Chart type */
export type ChartType = 'line' | 'bar' | 'pie' | 'metric' | 'table';

/** Chart position */
export interface ChartPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Chart query config */
export interface ChartQuery {
  eventType?: string;
  eventTypes?: string[];
  agg?: string;
  metric?: string;
  groupBy?: string;
  orderBy?: string;
  limit?: number;
  interval?: string;
  filter?: {
    key: string;
    op: string;
    value: unknown;
  };
  relative?: { days: number };
}

/** Dashboard chart widget config */
export interface ChartWidget {
  id: string;
  type: ChartType;
  title: string;
  query: ChartQuery;
  position: ChartPosition;
}

/** Dashboard config (stored as JSON) */
export interface DashboardConfig {
  name: string;
  type: 'system' | 'custom';
  layout?: string;
  gridCols?: number;
  charts: ChartWidget[];
}

/** Dashboard view object (response) */
export interface DashboardVO {
  id: number;
  name: string;
  config: DashboardConfig;
  createdBy: string;
  status: number;
  createdAt: string;
  updatedAt: string;
}

/** Create dashboard request */
export interface CreateDashboardRequest {
  name: string;
  config: DashboardConfig;
  status?: number;
}

/** Update dashboard request */
export interface UpdateDashboardRequest {
  name?: string;
  config?: DashboardConfig;
  status?: number;
}
