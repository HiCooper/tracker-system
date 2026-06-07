import ReactECharts from 'echarts-for-react';
import { Spin } from 'antd';

interface StepInfo {
  stepIndex: number;
  stepName: string;
}

interface TrendPoint {
  date: string;
  steps: { stepIndex: number; count: number; conversionRate: number }[];
}

interface Props {
  data: TrendPoint[];
  steps: StepInfo[];
  loading?: boolean;
  height?: number;
}

const COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#f5222d', '#faad14'];

export function FunnelTrendChart({ data, steps, loading = false, height = 300 }: Props) {
  if (loading) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  }

  if (!data || data.length === 0 || !steps || steps.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无数据</div>;
  }

  const option = {
    tooltip: { trigger: 'axis' as const },
    legend: {
      data: steps.map((s) => s.stepName),
      top: 0,
      type: 'scroll' as const,
    },
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category' as const,
      data: data.map((d) => d.date.slice(5)),
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: {
      type: 'value' as const,
      axisLabel: {
        formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
      },
      max: 1,
    },
    series: steps.map((step) => ({
      name: step.stepName,
      type: 'line' as const,
      data: data.map((d) => {
        const s = d.steps.find((x) => x.stepIndex === step.stepIndex);
        return s ? Math.round(s.conversionRate * 10000) / 10000 : null;
      }),
      smooth: true,
      symbol: 'circle',
      symbolSize: 3,
      lineStyle: { width: 2, color: COLORS[step.stepIndex % COLORS.length] },
      itemStyle: { color: COLORS[step.stepIndex % COLORS.length] },
    })),
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
