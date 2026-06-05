import ReactECharts from 'echarts-for-react';
import type { ChartSeries } from '../../types/analysis';
import { Spin } from 'antd';

interface Props {
  series: ChartSeries[];
  loading?: boolean;
  chartType?: 'line' | 'bar';
  height?: number;
}

export function TrendChart({ series, loading = false, chartType = 'line', height = 400 }: Props) {
  if (loading) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  }

  if (!series || series.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无数据</div>;
  }

  const times = series[0]?.data.map((d) => d.time) || [];

  const option = {
    tooltip: { trigger: 'axis' as const },
    legend: {
      data: series.map((s) => s.name),
      top: 0,
    },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      data: times,
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v),
      },
    },
    dataZoom: [
      { type: 'slider' as const, start: 0, end: 100, bottom: 0 },
      { type: 'inside' as const },
    ],
    series: series.map((s) => ({
      name: s.name,
      type: chartType,
      data: s.data.map((d) => d.value),
      smooth: chartType === 'line',
      symbol: 'circle',
      symbolSize: 4,
    })),
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
