import ReactECharts from 'echarts-for-react';
import { Spin } from 'antd';

interface FunnelStepData {
  stepName: string;
  count: number;
  conversionRate: number;
  stepConversionRate: number;
}

interface Props {
  data: FunnelStepData[];
  loading?: boolean;
  height?: number;
}

export function FunnelChart({ data, loading = false, height = 400 }: Props) {
  if (loading) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  }

  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无数据</div>;
  }

  const max = data[0]?.count || 1;

  const option = {
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: { name: string; value: number; dataIndex: number }) => {
        const d = data[params.dataIndex];
        return `${d.stepName}<br/>人数: ${d.count.toLocaleString()}<br/>整体转化: ${(d.conversionRate * 100).toFixed(1)}%<br/>步骤转化: ${(d.stepConversionRate * 100).toFixed(1)}%`;
      },
    },
    legend: { show: false },
    series: [
      {
        type: 'funnel',
        left: '15%',
        top: 20,
        bottom: 20,
        width: '70%',
        min: 0,
        max,
        sort: 'descending' as const,
        gap: 2,
        label: {
          show: true,
          position: 'inside' as const,
          formatter: (p: { name: string; value: number }) => `{name|${p.name}}\n{val|${p.value.toLocaleString()}}`,
          rich: {
            name: { fontSize: 13, lineHeight: 20 },
            val: { fontSize: 12, fontWeight: 'bold' },
          },
        },
        labelLine: { show: false },
        itemStyle: { borderWidth: 0 },
        data: data.map((d, i) => ({
          name: d.stepName,
          value: d.count,
          itemStyle: {
            color: ['#1677ff', '#4096ff', '#69b1ff', '#91caff', '#bae0ff', '#d6e4ff', '#e6f4ff'][i] || '#bae0ff',
          },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
