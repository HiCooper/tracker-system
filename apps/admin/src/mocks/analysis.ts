import type { EventAnalysisResponse, ChartSeries, DataPoint } from '../types/analysis';

function generateTimeSeries(days: number, baseValue: number, variance: number): DataPoint[] {
  const points: DataPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0;
    const randomFactor = 0.8 + Math.random() * 0.4;
    points.push({
      time: date.toISOString().split('T')[0],
      value: Math.round(baseValue * weekendMultiplier * randomFactor + (Math.random() - 0.5) * variance),
    });
  }
  return points;
}

export function generateMockAnalysis(): EventAnalysisResponse {
  const pageViewSeries: ChartSeries = {
    name: '页面浏览',
    eventType: 'page_view',
    data: generateTimeSeries(30, 50000, 10000),
  };

  const clickSeries: ChartSeries = {
    name: '点击事件',
    eventType: 'click',
    data: generateTimeSeries(30, 15000, 5000),
  };

  const exposureSeries: ChartSeries = {
    name: '曝光事件',
    eventType: 'exposure',
    data: generateTimeSeries(30, 120000, 20000),
  };

  return {
    interval: 'day',
    series: [pageViewSeries, clickSeries, exposureSeries],
    tableData: pageViewSeries.data.map((p, i) => ({
      time: p.time,
      page_view: p.value,
      click: clickSeries.data[i]?.value || 0,
      exposure: exposureSeries.data[i]?.value || 0,
    })),
  };
}
