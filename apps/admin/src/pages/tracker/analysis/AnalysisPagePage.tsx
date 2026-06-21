import { useEffect, useState } from 'react';
import { Card, Row, Col, DatePicker, Typography, Spin, Statistic, Breadcrumb, Table, Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useParams, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useAnalysisStore } from '../../../stores/analysisStore';
import { TrendChart } from '../../../components/charts/TrendChart';
import { TrendDetailModal } from '../../../components/trend/TrendDetailModal';
import type { PageMetric } from '../../../types/analysis';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export function AnalysisPagePage() {
  const { appCode } = useParams<{ appCode: string }>();
  const { pageMetrics, pageSummary, pageTrend, loading, timeRange, setTimeRange, fetchPageMetrics } = useAnalysisStore();
  useEffect(() => { if (appCode) fetchPageMetrics(appCode); }, [appCode, timeRange]);

  const [trendOpen, setTrendOpen] = useState(false);
  const [trendTitle, setTrendTitle] = useState('');
  const [trendSubtitle, setTrendSubtitle] = useState('');
  const [trendCode, setTrendCode] = useState('');

  const fmt = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v?.toLocaleString();

  const columns: ColumnsType<PageMetric> = [
    {
      title: '页面', dataIndex: 'pageName', key: 'page',
      render: (name: string, r) => <Link to={`/tracker/analysis/${appCode}/${r.pageCode}`}>{name}({r.pageCode})</Link>,
    },
    { title: 'PV', dataIndex: 'pv', key: 'pv', width: 100, render: (v: number) => fmt(v) },
    { title: 'UV', dataIndex: 'uv', key: 'uv', width: 100, render: (v: number) => fmt(v) },
    { title: '平均停留', dataIndex: 'avgStayDuration', key: 'avgStay', width: 100, render: (v: number) => `${Math.floor(v / 60)}m${v % 60}s` },
    { title: '跳出率', dataIndex: 'bounceRate', key: 'bounce', width: 80, render: (v: number) => `${(v * 100).toFixed(1)}%` },
    { title: '区块数', dataIndex: 'blockCount', key: 'blocks', width: 70, align: 'center' },
    {
      title: '操作', key: 'act', width: 100,
      render: (_, r) => <Button type="link" size="small" onClick={() => { setTrendTitle(`${r.pageName} — 趋势详情`); setTrendSubtitle(r.pageCode); setTrendCode(r.pageCode); setTrendOpen(true); }}>查看趋势</Button>,
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/analysis"><HomeOutlined /> 流量分析</Link> },
        { title: appCode },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{appCode} — 页面分析</Title>
        <RangePicker
          value={[dayjs(timeRange.startTime), dayjs(timeRange.endTime)]}
          onChange={(d) => { if (d?.[0] && d?.[1]) setTimeRange({ startTime: d[0].format('YYYY-MM-DD'), endTime: d[1].format('YYYY-MM-DD') }); }}
          presets={[{ label: '过去7天', value: [dayjs().subtract(6, 'd'), dayjs()] }, { label: '过去30天', value: [dayjs().subtract(29, 'd'), dayjs()] }]}
        />
      </div>

      {pageSummary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card size="small"><Statistic title="总 PV" value={fmt(pageSummary.totalPv)} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="总 UV" value={fmt(pageSummary.totalUv)} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="平均停留" value={`${Math.floor(pageSummary.avgStay / 60)}m${pageSummary.avgStay % 60}s`} /></Card></Col>
          <Col span={6}><Card size="small"><Statistic title="跳出率" value={`${(pageSummary.bounceRate * 100).toFixed(1)}%`} /></Card></Col>
        </Row>
      )}

      <Card style={{ marginBottom: 16 }}>
        <TrendChart data={pageTrend.map((d) => ({ time: d.time, exposurePv: d.exposurePv, exposureUv: d.exposureUv }))} loading={loading} height={300} />
      </Card>

      <Table bordered columns={columns} dataSource={pageMetrics} rowKey="pageCode" loading={loading} pagination={false} />

      <TrendDetailModal open={trendOpen} title={trendTitle} subtitle={trendSubtitle} code={trendCode} onClose={() => setTrendOpen(false)} />
    </div>
  );
}
