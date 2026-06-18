import { useEffect, useState } from 'react';
import { Card, Row, Col, DatePicker, Typography, Breadcrumb, Table, Button, Input, Select, Checkbox, Radio, Statistic, Space, Divider, Spin } from 'antd';
import { HomeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { AdvancedNav } from './AdvancedNav';
import type { ColumnsType } from 'antd/es/table';
import { useAdvancedAnalysisStore } from '../../../stores/advancedAnalysisStore';
import { useSetupStore } from '../../../stores/setupStore';
import { RetentionCurveChart } from '../../../components/charts/RetentionCurveChart';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const RETENTION_DAY_OPTIONS = [
  { label: 'Day 1', value: 1 },
  { label: 'Day 2', value: 2 },
  { label: 'Day 3', value: 3 },
  { label: 'Day 7', value: 7 },
  { label: 'Day 14', value: 14 },
  { label: 'Day 30', value: 30 },
];

function getCellColor(rate: number): string {
  if (rate >= 0.4) return '#f6ffed';
  if (rate >= 0.2) return '#fffbe6';
  return '#fff2f0';
}

function getTextColor(rate: number): string {
  if (rate >= 0.4) return '#52c41a';
  if (rate >= 0.2) return '#faad14';
  return '#ff4d4f';
}

export function RetentionAnalysisPage() {
  const { appCode } = useParams<{ appCode: string }>();
  const { apps, fetchApps } = useSetupStore();
  const { retentionCohorts, retentionCurve, retentionSummary, loading, timeRange, setTimeRange, fetchRetention } =
    useAdvancedAnalysisStore();

  useEffect(() => { fetchApps(); }, []);

  const appName = apps.find(a => a.appCode === appCode)?.appName || appCode;

  const [initialEvent, setInitialEvent] = useState('first_login');
  const [returnEvent, setReturnEvent] = useState('app_open');
  const [retentionDays, setRetentionDays] = useState<number[]>([1, 2, 3, 7, 14, 30]);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [platform, setPlatform] = useState('');
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    if (!initialEvent || !returnEvent) { return; }
    await fetchRetention({
      initialEvent, returnEvent, retentionDays: retentionDays.sort((a, b) => a - b),
      platform: platform || undefined, groupBy, appCode,
    });
    setAnalyzed(true);
  };

  useEffect(() => {
    if (analyzed) handleAnalyze();
  }, [timeRange]);

  const sortedDays = [...retentionDays].sort((a, b) => a - b);

  const cohortColumns: ColumnsType<{
    cohortDate: string;
    initialUsers: number;
    retentionRates: Record<string, number>;
    retentionCounts: Record<string, number>;
  }> = [
    {
      title: '队列日期', dataIndex: 'cohortDate', key: 'date', width: 110, fixed: 'left',
      render: (v: string) => v,
    },
    {
      title: '初始用户', dataIndex: 'initialUsers', key: 'init', width: 90,
      render: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v,
    },
    ...sortedDays.map((day) => ({
      title: `Day ${day}`,
      key: `day${day}`,
      width: 100,
      render: (_: unknown, r: { retentionRates: Record<string, number>; retentionCounts: Record<string, number> }) => {
        const rate = r.retentionRates[`day${day}`];
        const count = r.retentionCounts[`day${day}`];
        if (rate === undefined) return <span style={{ color: '#ccc' }}>—</span>;
        return (
          <div style={{
            background: getCellColor(rate), color: getTextColor(rate),
            padding: '2px 6px', borderRadius: 4, fontSize: 12, textAlign: 'center',
          }}>
            <div>{(rate * 100).toFixed(1)}%</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>{count}</div>
          </div>
        );
      },
    })),
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/advanced"><HomeOutlined /> 高级分析</Link> },
        { title: appName || appCode || '' },
        { title: '留存分析' },
      ]} />

      <AdvancedNav appCode={appCode} active="retention" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>留存分析 {appName ? `— ${appName}` : ''}</Title>
        <RangePicker
          value={[dayjs(timeRange.startTime), dayjs(timeRange.endTime)]}
          onChange={(d) => { if (d?.[0] && d?.[1]) setTimeRange({ startTime: d[0].format('YYYY-MM-DD'), endTime: d[1].format('YYYY-MM-DD') }); }}
          presets={[{ label: '过去7天', value: [dayjs().subtract(6, 'd'), dayjs()] }, { label: '过去30天', value: [dayjs().subtract(29, 'd'), dayjs()] }]}
        />
      </div>

      {/* Configuration Panel */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>起始事件:</span>
            <Input value={initialEvent} style={{ width: 160 }} onChange={(e) => setInitialEvent(e.target.value)} placeholder="e.g. first_login" />
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>回访事件:</span>
            <Input value={returnEvent} style={{ width: 160 }} onChange={(e) => setReturnEvent(e.target.value)} placeholder="e.g. app_open" />
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>平台:</span>
            <Select value={platform} style={{ width: 100 }} onChange={setPlatform} allowClear placeholder="全部"
              options={[{ label: 'Web', value: 'web' }, { label: 'Mobile', value: 'mobile' }]}
            />
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>粒度:</span>
            <Radio.Group value={groupBy} onChange={(e) => setGroupBy(e.target.value)} size="small">
              <Radio.Button value="day">日</Radio.Button>
              <Radio.Button value="week">周</Radio.Button>
              <Radio.Button value="month">月</Radio.Button>
            </Radio.Group>
          </Space>
        </Space>
        <Divider style={{ margin: '12px 0' }} />
        <Space wrap>
          <span style={{ fontSize: 12, color: '#666' }}>留存天数:</span>
          <Checkbox.Group
            options={RETENTION_DAY_OPTIONS}
            value={retentionDays}
            onChange={(v) => setRetentionDays(v as number[])}
          />
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleAnalyze} loading={loading}>分析</Button>
        </Space>
      </Card>

      {!analyzed && !loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>配置参数并点击"分析"查看留存数据</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* Summary */}
          {retentionSummary && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card size="small"><Statistic title="Day 1 留存率" value={`${(retentionSummary.day1Rate * 100).toFixed(1)}%`} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="Day 7 留存率" value={`${(retentionSummary.day7Rate * 100).toFixed(1)}%`} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="Day 30 留存率" value={`${(retentionSummary.day30Rate * 100).toFixed(1)}%`} /></Card></Col>
              <Col span={6}><Card size="small"><Statistic title="初始用户总数" value={retentionSummary.totalInitialUsers.toLocaleString()} /></Card></Col>
            </Row>
          )}

          {/* Retention Curve */}
          <Card style={{ marginBottom: 16 }}>
            <RetentionCurveChart data={retentionCurve} loading={loading} height={320} />
          </Card>

          {/* Cohort Matrix Table */}
          <Card title="队列留存矩阵" size="small">
            <Table
              bordered
              columns={cohortColumns}
              dataSource={retentionCohorts}
              rowKey="cohortDate"
              loading={loading}
              pagination={{ pageSize: 14 }}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
