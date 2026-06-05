export const METRICS = ['曝光PV', '曝光UV', '点击PV', '点击UV', 'CTR', '渗透率'] as const;
export type MetricName = typeof METRICS[number];

export const METRIC_KEYS: Record<MetricName, string> = {
  '曝光PV': 'exposurePv', '曝光UV': 'exposureUv', '点击PV': 'clickPv',
  '点击UV': 'clickUv', 'CTR': 'ctr', '渗透率': 'penetrationRate',
};

export function fmtVal(v: number, isPct: boolean) {
  if (isPct) return `${(v * 100).toFixed(1)}%`;
  return v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString();
}

export function delta(cur: number, prev: number | null) {
  if (prev === null || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}
