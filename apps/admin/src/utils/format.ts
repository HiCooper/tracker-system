import dayjs from 'dayjs';

/**
 * Format a number with locale string (commas)
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN');
}

/**
 * Format a number as abbreviated (万, 亿)
 */
export function formatLargeNumber(n: number): string {
  if (n >= 100000000) {
    return `${(n / 100000000).toFixed(2)}亿`;
  }
  if (n >= 10000) {
    return `${(n / 10000).toFixed(1)}万`;
  }
  return n.toLocaleString('zh-CN');
}

/**
 * Format ISO date string to YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(isoStr: string): string {
  return dayjs(isoStr).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Format ISO date string to YYYY-MM-DD
 */
export function formatDate(isoStr: string): string {
  return dayjs(isoStr).format('YYYY-MM-DD');
}
