import { useEffect, useState } from 'react';
import { Card, Row, Col, DatePicker, Typography, Statistic, Breadcrumb, Table, Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useParams, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useAnalysisStore } from '../../../stores/analysisStore';
import { TrendChart } from '../../../components/charts/TrendChart';
import { TrendDetailModal } from '../../../components/trend/TrendDetailModal';
import type { BlockMetric } from '../../../types/analysis';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export function AnalysisBlockPage() {
  const { appCode, pageCode } = useParams<{ appCode: string; pageCode: string }>();
  const { blockMetrics, blockSummary, blockTrend, loading, timeRange, setTimeRange, fetchBlockMetrics } = useAnalysisStore();
  const [trendOpen, setTrendOpen] = useState(false);
  const [trendTitle, setTrendTitle] = useState('');
  const [trendSubtitle, setTrendSubtitle] = useState('');
  const [trendCode, setTrendCode] = useState('');

  useEffect(() => { if (appCode && pageCode) fetchBlockMetrics(appCode, pageCode); }, [appCode, pageCode, timeRange]);

  const fmt = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v?.toLocaleString();

  const columns: ColumnsType<BlockMetric> = [
    {
      title: '区块', dataIndex: 'blockName', key: 'bname',
      render: (name: string, r) => {
        const parts = r.blockCode.split('.');
        const pc = parts.slice(1, 2)[0];
        const bc = parts.slice(2).join('.');
        return <Link to={`/tracker/analysis/${appCode}/${pc}/${bc}`}>{name}({r.blockCode})</Link>;
      },
    },
    { title: '曝光PV', dataIndex: 'exposurePv', key: 'epv', width: 100, render: (v: number) => fmt(v) },
    { title: '曝光UV', dataIndex: 'exposureUv', key: 'euv', width: 100, render: (v: number) => fmt(v) },
    { title: '点击PV', dataIndex: 'clickPv', key: 'cpv', width: 100, render: (v: number) => v > 0 ? fmt(v) : <span style={{ color: '#ccc' }}>—</span> },
    { title: '点击UV', dataIndex: 'clickUv', key: 'cuv', width: 100, render: (v: number) => v > 0 ? fmt(v) : <span style={{ color: '#ccc' }}>—</span> },
    { title: 'CTR', dataIndex: 'ctr', key: 'ctr', width: 80, render: (v: number) => v > 0 ? `${(v * 100).toFixed(1)}%` : <span style={{ color: '#ccc' }}>—</span> },
    { title: '功能数', dataIndex: 'functionCount', key: 'fcnt', width: 70, align: 'center' },
    {
      title: '操作', key: 'act', width: 100,
      render: (_, r) => <Button type="link" size="small" onClick={() => { setTrendTitle(`${r.blockName} — 趋势详情`); setTrendSubtitle(r.blockCode); setTrendCode(r.blockCode); setTrendOpen(true); }}>查看趋势</Button>,
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/analysis"><HomeOutlined /> 流量分析</Link> },
        { title: <Link to={`/tracker/analysis/${appCode}`}>{appCode}</Link> },
        { title: pageCode },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{appCode}.{pageCode} — 区块分析</Title>
        <RangePicker value={[dayjs(timeRange.startTime), dayjs(timeRange.endTime)]} onChange={(d) => { if (d?.[0] && d?.[1]) setTimeRange({ startTime: d[0].format('YYYY-MM-DD'), endTime: d[1].format('YYYY-MM-DD') }); }} presets={[{ label: '过去7天', value: [dayjs().subtract(6, 'd'), dayjs()] }, { label: '过去30天', value: [dayjs().subtract(29, 'd'), dayjs()] }]} />
      </div>

      {blockSummary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}><Card size="small"><Statistic title="区块曝光PV" value={fmt(blockSummary.totalExposurePv)} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="区块曝光UV" value={fmt(blockSummary.totalExposureUv)} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="区块数" value={blockSummary.blockCount} /></Card></Col>
        </Row>
      )}

      <Card style={{ marginBottom: 16 }}>
        <TrendChart data={blockTrend.map((d) => ({ time: d.time.slice(5), exposurePv: d.exposurePv, exposureUv: d.exposureUv }))} loading={loading} height={300} />
      </Card>

      <Table bordered columns={columns} dataSource={blockMetrics} rowKey="blockCode" loading={loading} pagination={false} />

      <TrendDetailModal open={trendOpen} title={trendTitle} subtitle={trendSubtitle} code={trendCode} onClose={() => setTrendOpen(false)} />
    </div>
  );
}
