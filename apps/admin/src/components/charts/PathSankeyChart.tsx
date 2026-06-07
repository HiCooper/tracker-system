import ReactECharts from 'echarts-for-react';
import { Spin } from 'antd';

interface PathNode {
  name: string;
  value: number;
}

interface PathTransition {
  source: string;
  target: string;
  count: number;
  rate: number;
}

interface Props {
  nodes: PathNode[];
  transitions: PathTransition[];
  loading?: boolean;
  height?: number;
}

export function PathSankeyChart({ nodes, transitions, loading = false, height = 500 }: Props) {
  if (loading) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  }

  if (!nodes || nodes.length === 0 || !transitions || transitions.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>暂无数据</div>;
  }

  const option = {
    tooltip: {
      trigger: 'item' as const,
      formatter: (params: { dataType: string; name: string; value: number; data: { source?: string; target?: string; rate?: number } }) => {
        if (params.dataType === 'edge' || params.data.source) {
          return `${params.data.source} → ${params.data.target}<br/>次数: ${params.value.toLocaleString()}<br/>占比: ${((params.data.rate || 0) * 100).toFixed(1)}%`;
        }
        return `${params.name}<br/>流量: ${params.value.toLocaleString()}`;
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' as const },
        nodeAlign: 'left' as const,
        layoutIterations: 32,
        data: nodes.map((n) => ({ name: n.name, itemStyle: { color: '#1677ff' } })),
        links: transitions.map((t) => ({
          source: t.source,
          target: t.target,
          value: t.count,
        })),
        label: {
          fontSize: 12,
          color: '#333',
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
          opacity: 0.3,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
