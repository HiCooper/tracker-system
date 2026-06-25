import { useEffect, useState } from 'react';
import { Card, Row, Col, DatePicker, Typography, Statistic, Breadcrumb, Table, Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useParams, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useAnalysisStore } from '../../../stores/analysisStore';
import { formatNumber as fmt } from '../../../utils/format';
import { TrendChart } from '../../../components/charts/TrendChart';
import { TrendDetailModal } from '../../../components/trend/TrendDetailModal';
import type { FunctionMetric } from '../../../types/analysis';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export function AnalysisFunctionPage() {
  const { appCode, pageCode, blockCode } = useParams<{ appCode: string; pageCode: string; blockCode: string }>();
  const { functionMetrics, funcSummary, funcTrend, loading, timeRange, setTimeRange, fetchFunctionMetrics } = useAnalysisStore();

  // URL has short blockCode (suffix); reconstruct full qualified code for API
  const fullBlockCode = pageCode && blockCode ? `${pageCode}.${blockCode}` : '';

  const [trendOpen, setTrendOpen] = useState(false);
  const [trendTitle, setTrendTitle] = useState('');
  const [trendSubtitle, setTrendSubtitle] = useState('');
  const [trendCode, setTrendCode] = useState('');

  useEffect(() => { if (appCode && pageCode && fullBlockCode) fetchFunctionMetrics(appCode, pageCode, fullBlockCode); }, [appCode, pageCode, fullBlockCode, timeRange]);


  const columns: ColumnsType<FunctionMetric> = [
    {
      title: '功能', dataIndex: 'funcName', key: 'func',
      render: (name: string, r: FunctionMetric) => <span style={{ color: '#1677ff' }}>{name}({r.funcCode})</span>,
    },
    { title: '曝光PV', dataIndex: 'exposurePv', key: 'epv', width: 100, render: (v: number) => fmt(v) },
    { title: '曝光UV', dataIndex: 'exposureUv', key: 'euv', width: 100, render: (v: number) => fmt(v) },
    { title: '点击PV', dataIndex: 'clickPv', key: 'cpv', width: 100, render: (v: number) => v > 0 ? fmt(v) : <span style={{ color: '#ccc' }}>—</span> },
    { title: '点击UV', dataIndex: 'clickUv', key: 'cuv', width: 100, render: (v: number) => v > 0 ? fmt(v) : <span style={{ color: '#ccc' }}>—</span> },
    { title: 'CTR', dataIndex: 'ctr', key: 'ctr', width: 80, render: (v: number) => v > 0 ? `${(v * 100).toFixed(1)}%` : <span style={{ color: '#ccc' }}>—</span> },
    { title: '渗透率', dataIndex: 'penetrationRate', key: 'pen', width: 80, render: (v: number) => `${(v * 100).toFixed(1)}%` },
    {
      title: '操作', key: 'act', width: 100,
      render: (_, r) => <Button type="link" size="small" onClick={() => { setTrendTitle(`${r.funcName} — 趋势详情`); setTrendSubtitle(r.funcCode); setTrendCode(r.funcCode); setTrendOpen(true); }}>查看趋势</Button>,
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/analysis"><HomeOutlined /> 流量分析</Link> },
        { title: <Link to={`/tracker/analysis/${appCode}`}>{appCode}</Link> },
        { title: <Link to={`/tracker/analysis/${appCode}/${pageCode}`}>{pageCode}</Link> },
        { title: blockCode },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{appCode}.{pageCode}.{blockCode} — 功能分析</Title>
        <RangePicker value={[dayjs(timeRange.startTime), dayjs(timeRange.endTime)]} onChange={(d) => { if (d?.[0] && d?.[1]) setTimeRange({ startTime: d[0].format('YYYY-MM-DD'), endTime: d[1].format('YYYY-MM-DD') }); }} presets={[{ label: '过去7天', value: [dayjs().subtract(6, 'd'), dayjs()] }, { label: '过去30天', value: [dayjs().subtract(29, 'd'), dayjs()] }]} />
      </div>

      {funcSummary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}><Card size="small"><Statistic title="功能曝光PV" value={fmt(funcSummary.totalExposurePv)} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="功能曝光UV" value={fmt(funcSummary.totalExposureUv)} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="功能数" value={funcSummary.functionCount} /></Card></Col>
        </Row>
      )}

      <Card style={{ marginBottom: 16 }}>
        <TrendChart data={funcTrend.map((d) => ({ time: d.time, exposurePv: d.exposurePv, exposureUv: d.exposureUv }))} loading={loading} height={300} />
      </Card>

      <Table scroll={{ x: 'max-content' }} bordered columns={columns} dataSource={functionMetrics} rowKey="funcCode" loading={loading} pagination={false} />

      <TrendDetailModal open={trendOpen} title={trendTitle} subtitle={trendSubtitle} code={trendCode} onClose={() => setTrendOpen(false)} />
    </div>
  );
}
