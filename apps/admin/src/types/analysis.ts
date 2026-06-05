export interface TrendPoint {
  time: string;
  exposurePv: number;
  exposureUv: number;
}

export interface AppMetric {
  appCode: string;
  appName: string;
  dau: number;
  totalPv: number;
  pageCount: number;
}

export interface PageMetric {
  pageCode: string;
  pageName: string;
  pv: number;
  uv: number;
  avgStayDuration: number;
  bounceRate: number;
  blockCount: number;
}

export interface BlockMetric {
  blockCode: string;
  blockName: string;
  exposurePv: number;
  exposureUv: number;
  clickPv: number;
  clickUv: number;
  ctr: number;
  functionCount: number;
}

export interface FunctionMetric {
  funcCode: string;
  funcName: string;
  exposurePv: number;
  exposureUv: number;
  clickPv: number;
  clickUv: number;
  ctr: number;
  penetrationRate: number;
}

export interface DayData {
  date: string;
  exposurePv: number;
  exposureUv: number;
  clickPv: number;
  clickUv: number;
  ctr: number;
  penetrationRate: number;
}

export interface PageAnalysisResult {
  trend: TrendPoint[];
  summary: Record<string, number>;
  pages: PageMetric[];
}

export interface BlockAnalysisResult {
  trend: TrendPoint[];
  summary: Record<string, number>;
  blocks: BlockMetric[];
}

export interface FunctionAnalysisResult {
  trend: TrendPoint[];
  summary: Record<string, number>;
  functions: FunctionMetric[];
}

export interface TrendDetailResult {
  detail: DayData[];
}
