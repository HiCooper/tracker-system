import { useEffect, useState } from 'react';
import { Modal, Table, Radio, Checkbox, Spin } from 'antd';
import { CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAnalysisStore } from '../../stores/analysisStore';
import { METRICS, METRIC_KEYS, fmtVal, delta } from '../../utils/trendHelpers';
import { MetricChartModal } from './MetricChartModal';
import type { DayData } from '../../types/analysis';

interface Props {
  open: boolean;
  title: string;
  subtitle: string;
  code: string;
  onClose: () => void;
}

export function TrendDetailModal({ open, title, subtitle, code, onClose }: Props) {
  const { dayDetail, loading, fetchTrendDetail } = useAnalysisStore();
  const [days, setDays] = useState(7);
  const [showDay, setShowDay] = useState(true);
  const [showWeek, setShowWeek] = useState(true);
  const [chartMetric, setChartMetric] = useState<string | null>(null);

  useEffect(() => {
    if (open) fetchTrendDetail(code, days + 30);
  }, [open, code, days]);

  const dates = dayDetail.slice(0, days).map((d) => d.date);

  const columns: ColumnsType<Record<string, unknown>> = [
    {
      title: '指标', dataIndex: 'metric', key: 'metric', width: 90, fixed: 'left' as const,
      render: (m: string) => <a style={{ color: '#1677ff', cursor: 'pointer' }} onClick={() => setChartMetric(m)}>{m}</a>,
    },
    ...dates.map((d) => ({ title: d, dataIndex: d, key: d, width: 140, align: 'right' as const })),
  ];

  const rows = METRICS.map((metric) => {
    const key = METRIC_KEYS[metric];
    const isPct = metric === 'CTR' || metric === '渗透率';
    const cells: Record<string, React.ReactNode> = {};

    for (let i = 0; i < days; i++) {
      const cur = dayDetail[i]?.[key as keyof DayData] as number | undefined;
      if (cur === undefined) { cells[dayDetail[i]?.date || i] = '-'; continue; }
      const yest = showDay && i + 1 < dayDetail.length ? (dayDetail[i + 1]?.[key as keyof DayData] as number) : null;
      const week = showWeek && i + 7 < dayDetail.length ? (dayDetail[i + 7]?.[key as keyof DayData] as number) : null;
      const dDay = delta(cur, yest);
      const dWeek = delta(cur, week);
      const dk = dayDetail[i].date;

      if (isPct && cur <= 0) {
        cells[dk] = <span style={{ color: '#ccc' }}>—</span>;
      } else {
        cells[dk] = (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 500 }}>{fmtVal(cur, isPct)}</div>
            {dDay !== null && <div style={{ fontSize: 11, color: dDay >= 0 ? '#cf1322' : '#3f8600' }}>{dDay >= 0 ? <CaretUpOutlined /> : <CaretDownOutlined />}{Math.abs(dDay).toFixed(1)}% 日</div>}
            {dWeek !== null && <div style={{ fontSize: 11, color: dWeek >= 0 ? '#cf1322' : '#3f8600' }}>{dWeek >= 0 ? <CaretUpOutlined /> : <CaretDownOutlined />}{Math.abs(dWeek).toFixed(1)}% 周</div>}
          </div>
        );
      }
    }
    return { metric, ...cells };
  });

  return (
    <>
      <Modal
        title={<div>{title}<div style={{ fontSize: 13, fontWeight: 400, color: '#999', marginTop: 4 }}><code>{subtitle}</code></div></div>}
        open={open}
        onCancel={() => { onClose(); setChartMetric(null); }}
        footer={null}
        width={Math.min(days * 160 + 100, window.innerWidth - 80)}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
          <Radio.Group value={days} onChange={(e) => { setDays(e.target.value); setChartMetric(null); }}>
            <Radio.Button value={7}>过去7天</Radio.Button>
            <Radio.Button value={30}>过去30天</Radio.Button>
          </Radio.Group>
          <Checkbox checked={showDay} onChange={(e) => setShowDay(e.target.checked)}>日同比</Checkbox>
          <Checkbox checked={showWeek} onChange={(e) => setShowWeek(e.target.checked)}>周同比</Checkbox>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
          <Table bordered columns={columns} dataSource={rows} pagination={false} size="small" scroll={{ x: 'max-content' }} rowKey="metric" />
        )}
      </Modal>

      <MetricChartModal
        metric={chartMetric}
        dayDetail={dayDetail}
        visibleDays={days}
        onClose={() => setChartMetric(null)}
      />
    </>
  );
}
