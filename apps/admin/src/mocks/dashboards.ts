import type { DashboardVO } from '../types/dashboard';

export const mockDashboards: DashboardVO[] = [
  {
    id: 1,
    name: '整体趋势',
    createdBy: 'system',
    status: 1,
    createdAt: '2024-01-01T00:00:00',
    updatedAt: '2024-06-01T00:00:00',
    config: {
      name: '整体趋势',
      type: 'system',
      charts: [
        { id: 'chart1', type: 'line', title: '活跃设备数趋势', query: { eventType: '*', agg: 'uniq(device_id)', interval: 'day' }, position: { x: 0, y: 0, w: 6, h: 4 } },
        { id: 'chart2', type: 'line', title: '活跃账号数趋势', query: { eventType: '*', agg: 'uniq(user_id)', interval: 'day' }, position: { x: 6, y: 0, w: 6, h: 4 } },
        { id: 'chart3', type: 'line', title: '关键行为次数', query: { eventTypes: ['page_view', 'click', 'exposure'], agg: 'count', interval: 'day' }, position: { x: 0, y: 4, w: 12, h: 4 } },
        { id: 'chart4', type: 'table', title: 'TOP10 页面浏览丨设备数', query: { eventType: 'page_view', agg: 'uniq(device_id)', orderBy: 'desc', limit: 10 }, position: { x: 0, y: 8, w: 6, h: 6 } },
        { id: 'chart5', type: 'table', title: 'TOP10 控件点击丨设备数', query: { eventType: 'click', agg: 'uniq(device_id)', orderBy: 'desc', limit: 10 }, position: { x: 6, y: 8, w: 6, h: 6 } },
      ],
    },
  },
  {
    id: 2,
    name: '新增用户',
    createdBy: 'system',
    status: 1,
    createdAt: '2024-01-01T00:00:00',
    updatedAt: '2024-06-01T00:00:00',
    config: {
      name: '新增用户',
      type: 'system',
      charts: [
        { id: 'chart1', type: 'line', title: '过去7天丨新增设备数', query: { eventType: '*', agg: 'uniq(device_id)', filter: { key: 'is_new_device', op: 'eq', value: true }, interval: 'day', relative: { days: 7 } }, position: { x: 0, y: 0, w: 6, h: 4 } },
        { id: 'chart2', type: 'line', title: '过去7天丨新增账号数', query: { eventType: '*', agg: 'uniq(user_id)', filter: { key: 'is_new_user', op: 'eq', value: true }, interval: 'day', relative: { days: 7 } }, position: { x: 6, y: 0, w: 6, h: 4 } },
        { id: 'chart3', type: 'pie', title: '新增用户趋势占比', query: { eventType: '*', agg: 'uniq(device_id)', groupBy: 'is_new_device' }, position: { x: 0, y: 4, w: 6, h: 4 } },
      ],
    },
  },
  {
    id: 3,
    name: 'Session分析',
    createdBy: 'system',
    status: 1,
    createdAt: '2024-01-01T00:00:00',
    updatedAt: '2024-06-01T00:00:00',
    config: {
      name: 'Session分析',
      type: 'system',
      charts: [
        { id: 'chart1', type: 'line', title: '会话次数趋势', query: { metric: 'session_count', interval: 'day' }, position: { x: 0, y: 0, w: 6, h: 4 } },
        { id: 'chart2', type: 'line', title: '平均会话时长', query: { metric: 'avg_duration', interval: 'day' }, position: { x: 6, y: 0, w: 6, h: 4 } },
        { id: 'chart3', type: 'line', title: '平均页面深度', query: { metric: 'avg_page_depth', interval: 'day' }, position: { x: 0, y: 4, w: 6, h: 4 } },
        { id: 'chart4', type: 'table', title: 'TOP10 退出率页面', query: { metric: 'exit_rate', groupBy: 'page_url', orderBy: 'desc', limit: 10 }, position: { x: 6, y: 4, w: 6, h: 4 } },
      ],
    },
  },
];
