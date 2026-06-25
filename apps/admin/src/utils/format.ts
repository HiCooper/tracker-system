/**
 * 全站统一的数值/百分比/时长格式化,取代各页散落的内联实现(避免「1,000,000 / 100.0万 / —」三套并存)。
 */

/** 大数:>=1 万显示「X.X万」,否则千分位;null/NaN → fallback。 */
export function formatNumber(v: number | null | undefined, fallback = '—'): string {
  if (v == null || Number.isNaN(v)) return fallback;
  return v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString();
}

/** 百分比:约定传入「百分数值」(如 45.2)→ "45.2%";null/NaN → fallback。 */
export function formatPercent(v: number | null | undefined, fractionDigits = 1, fallback = '—'): string {
  if (v == null || Number.isNaN(v)) return fallback;
  return `${v.toFixed(fractionDigits)}%`;
}

/** 时长(秒)→「Xm Ys / Xs」;null/NaN → fallback。 */
export function formatDuration(seconds: number | null | undefined, fallback = '—'): string {
  if (seconds == null || Number.isNaN(seconds)) return fallback;
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}
