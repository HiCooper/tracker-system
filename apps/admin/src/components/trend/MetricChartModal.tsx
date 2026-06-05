import { useMemo, useState } from 'react';
import { Modal, Checkbox } from 'antd';
import ReactECharts from 'echarts-for-react';
import { METRIC_KEYS } from '../../utils/trendHelpers';
import type { MetricName } from '../../utils/trendHelpers';
import type { DayData } from '../../types/analysis';

interface Props {
  metric: string | null;
  dayDetail: DayData[];
  visibleDays: number;
  onClose: () => void;
}

export function MetricChartModal({ metric, dayDetail, visibleDays, onClose }: Props) {
  const [compWeek, setCompWeek] = useState(false);
  const [compMonth, setCompMonth] = useState(false);

  const option = useMemo(() => {
    if (!metric || dayDetail.length === 0) return null;
    const isPct = metric === 'CTR' || metric === '渗透率';
    const key = METRIC_KEYS[metric as MetricName];

    // current: first `visibleDays` items (most recent)
    const cur = dayDetail.slice(0, visibleDays).map((d) => ({
      time: d.date.slice(5),
      value: d[key as keyof DayData] as number,
    }));

    const legend: string[] = ['当前'];
    const series: Record<string, unknown>[] = [{
      name: '当前', type: 'line',
      data: cur.map((d) => isPct ? +(d.value * 100).toFixed(1) : d.value).reverse(),
      smooth: true, symbol: 'circle', symbolSize: 3,
      lineStyle: { width: 2, color: '#1677ff' },
      itemStyle: { color: '#1677ff' },
      areaStyle: { color: 'rgba(22,119,255,0.06)' },
    }];

    // last week: offset 7, same length
    if (compWeek && dayDetail.length >= visibleDays + 7) {
      const week = dayDetail.slice(7, 7 + visibleDays).map((d) => ({
        time: d.date.slice(5),
        value: d[key as keyof DayData] as number,
      }));
      legend.push('上周同期');
      series.push({
        name: '上周同期', type: 'line',
        data: week.map((d) => isPct ? +(d.value * 100).toFixed(1) : d.value).reverse(),
        smooth: true, symbol: 'diamond', symbolSize: 3,
        lineStyle: { width: 2, color: '#fa8c16', type: 'dashed' },
        itemStyle: { color: '#fa8c16' },
      });
    }

    // last month: offset 30, same length
    if (compMonth && dayDetail.length >= visibleDays + 30) {
      const month = dayDetail.slice(30, 30 + visibleDays).map((d) => ({
        time: d.date.slice(5),
        value: d[key as keyof DayData] as number,
      }));
      legend.push('上月同期');
      series.push({
        name: '上月同期', type: 'line',
        data: month.map((d) => isPct ? +(d.value * 100).toFixed(1) : d.value).reverse(),
        smooth: true, symbol: 'triangle', symbolSize: 4,
        lineStyle: { width: 2, color: '#722ed1', type: 'dashed' },
        itemStyle: { color: '#722ed1' },
      });
    }

    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: legend, top: 0 },
      grid: { left: 55, right: 25, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: cur.map((d) => d.time).reverse(), axisLabel: { fontSize: 10 } },
      yAxis: {
        type: 'value' as const,
        axisLabel: { fontSize: 10, formatter: (v: number) => isPct ? `${v}%` : (v >= 10000 ? `${(v / 10000).toFixed(0)}万` : String(v)) },
      },
      series,
    };
  }, [metric, dayDetail, visibleDays, compWeek, compMonth]);

  return (
    <Modal
      title={metric ? `${metric} 走势` : ''}
      open={!!metric}
      onCancel={() => { onClose(); setCompWeek(false); setCompMonth(false); }}
      footer={null}
      width={640}
      centered
    >
      <div style={{ marginBottom: 12, display: 'flex', gap: 16 }}>
        <Checkbox checked={compWeek} onChange={(e) => setCompWeek(e.target.checked)}>同比上周</Checkbox>
        <Checkbox checked={compMonth} onChange={(e) => setCompMonth(e.target.checked)}>同比上月</Checkbox>
      </div>
      {option && <ReactECharts key={`${compWeek}-${compMonth}-${metric}`} option={option} notMerge style={{ height: 340 }} />}
    </Modal>
  );
}
