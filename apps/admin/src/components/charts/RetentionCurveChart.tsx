import ReactECharts from 'echarts-for-react';
import { Spin } from 'antd';

interface Props {
  data: { day: number; rate: number }[];
  loading?: boolean;
  height?: number;
}

export function RetentionCurveChart({ data, loading = false, height = 300 }: Props) {
  if (loading) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  }

  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无数据</div>;
  }

  const option = {
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `Day ${p.name}<br/>留存率: ${(p.value * 100).toFixed(1)}%`;
      },
    },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      data: data.map((d) => `Day ${d.day}`),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
      },
      min: 0,
      max: 1,
    },
    series: [
      {
        type: 'line',
        data: data.map((d) => Math.round(d.rate * 10000) / 10000),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: '#1677ff' },
        itemStyle: { color: '#1677ff' },
        areaStyle: { color: 'rgba(22,119,255,0.12)' },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: '#ccc' },
          data: [
            { yAxis: 0.5, label: { formatter: '50%', fontSize: 11 } },
          ],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
