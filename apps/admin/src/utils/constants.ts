/** Event category display labels */
export const CATEGORY_LABELS: Record<string, string> = {
  page_view: '页面浏览',
  click: '点击事件',
  exposure: '曝光事件',
  custom: '自定义',
};

/** Event category colors */
export const CATEGORY_COLORS: Record<string, string> = {
  page_view: 'blue',
  click: 'orange',
  exposure: 'green',
  custom: 'purple',
};

/** Data type labels */
export const DATA_TYPE_LABELS: Record<string, string> = {
  string: '字符串',
  number: '数字',
  boolean: '布尔',
  date: '日期',
};

/** Time interval options for select */
export const INTERVAL_OPTIONS = [
  { label: '按小时', value: 'hour' },
  { label: '按天', value: 'day' },
  { label: '按周', value: 'week' },
  { label: '按月', value: 'month' },
];
