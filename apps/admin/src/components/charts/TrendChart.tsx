import ReactECharts from 'echarts-for-react';
import { Spin } from 'antd';

interface Props {
  data: { time: string; exposurePv: number; exposureUv: number }[];
  loading?: boolean;
  height?: number;
}

export function TrendChart({ data, loading = false, height = 300 }: Props) {
  if (loading) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  }

  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无数据</div>;
  }

  const option = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['曝光PV', '曝光UV'], top: 0 },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      data: data.map((d) => d.time),
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v)),
      },
    },
    series: [
      {
        name: '曝光PV',
        type: 'line',
        data: data.map((d) => d.exposurePv),
        smooth: true,
        symbol: 'circle',
        symbolSize: 3,
        lineStyle: { width: 2, color: '#1677ff' },
        itemStyle: { color: '#1677ff' },
        areaStyle: { color: 'rgba(22,119,255,0.08)' },
      },
      {
        name: '曝光UV',
        type: 'line',
        data: data.map((d) => d.exposureUv),
        smooth: true,
        symbol: 'circle',
        symbolSize: 3,
        lineStyle: { width: 2, color: '#52c41a' },
        itemStyle: { color: '#52c41a' },
        areaStyle: { color: 'rgba(82,196,26,0.08)' },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
