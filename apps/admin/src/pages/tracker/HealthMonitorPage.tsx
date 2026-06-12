import { useEffect, useState, useCallback } from 'react';
import {
  Card, Row, Col, Statistic, Typography, Tag, Spin, Space, Table, Descriptions, Progress,
  Tabs, Select, Badge, Empty,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  ThunderboltOutlined, BugOutlined, ApiOutlined, DashboardOutlined,
  WarningOutlined, RiseOutlined, FallOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { PerfMetricSummary, ErrorAggregation, ApiCallSummary, HealthDashboard } from '../../services/healthApi';
import { useHealthStore } from '../../stores/healthStore';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;

// ============ Infrastructure Check ============

interface ServiceHealth {
  name: string;
  url: string;
  status: 'UP' | 'DOWN' | 'loading';
  details?: Record<string, unknown>;
}

const INFRA_SERVICES: ServiceHealth[] = [
  { name: 'Tracker Service', url: 'http://localhost:8088/actuator/health', status: 'loading' },
  { name: 'ClickHouse', url: 'http://localhost:8123/?query=SELECT+1', status: 'loading' },
];

// ============ Sub-components ============

function PerfMetricCard({ data }: { data: PerfMetricSummary }) {
  const color = data.rating === 'good' ? '#52c41a' : data.rating === 'needs-improvement' ? '#faad14' : '#ff4d4f';
  const label = data.rating === 'good' ? '优' : data.rating === 'needs-improvement' ? '中' : '差';
  const isMs = data.metric !== 'CLS';
  return (
    <Card size="small">
      <Statistic
        title={<Space size={4}>{data.metric}<Tag color={color === '#52c41a' ? 'success' : color === '#faad14' ? 'warning' : 'error'} style={{ fontSize: 10 }}>{label}</Tag></Space>}
        value={data.p50}
        suffix={isMs ? 'ms' : ''}
        precision={isMs ? 0 : 3}
        valueStyle={{ color, fontSize: 22 }}
      />
      <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
        P75: {isMs ? `${data.p75}ms` : data.p75.toFixed(3)} · P95: {isMs ? `${data.p95}ms` : data.p95.toFixed(3)}
      </div>
    </Card>
  );
}

function ErrorTable({ errors, loading }: { errors: ErrorAggregation[]; loading: boolean }) {
  const columns = [
    { title: '错误信息', dataIndex: 'message', key: 'message', ellipsis: true, width: 280,
      render: (v: string) => <Text code style={{ fontSize: 12, maxWidth: 260, display: 'inline-block' }} ellipsis>{v}</Text> },
    { title: '次数', dataIndex: 'count', key: 'count', width: 70, sorter: (a: ErrorAggregation, b: ErrorAggregation) => b.count - a.count },
    { title: '影响用户', dataIndex: 'affectedUsers', key: 'users', width: 70 },
    { title: '趋势', dataIndex: 'trend', key: 'trend', width: 60,
      render: (v: string) => v === 'up' ? <RiseOutlined style={{ color: '#ff4d4f' }} /> :
        v === 'down' ? <FallOutlined style={{ color: '#52c41a' }} /> : <span style={{ color: '#999' }}>→</span> },
    { title: '最后出现', dataIndex: 'lastSeen', key: 'lastSeen', width: 110,
      render: (v: string) => <Text style={{ fontSize: 11, color: '#999' }}>{dayjs(v).fromNow()}</Text> },
  ];
  return <Table rowKey="fingerprint" columns={columns} dataSource={errors} loading={loading} size="small" pagination={false} />;
}

function ApiTable({ data, loading, type }: { data: ApiCallSummary[]; loading: boolean; type: 'error' | 'slow' }) {
  const columns = [
    { title: '接口', dataIndex: 'url', key: 'url', ellipsis: true, width: 200,
      render: (v: string, r: ApiCallSummary) => <Space size={4}><Tag color="blue">{r.method}</Tag><Text code style={{ fontSize: 12, maxWidth: 140, display: 'inline-block' }} ellipsis>{v}</Text></Space> },
    { title: '调用量', dataIndex: 'count', key: 'count', width: 70, render: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v },
    ...(type === 'error' ? [
      { title: '错误率', dataIndex: 'errorRate', key: 'errorRate', width: 70, render: (v: number) => <span style={{ color: v > 0.05 ? '#ff4d4f' : '#faad14' }}>{(v * 100).toFixed(1)}%</span> },
    ] : []),
    { title: 'P50', dataIndex: 'p50Duration', key: 'p50', width: 60, render: (v: number) => `${v}ms` },
    { title: 'P95', dataIndex: 'p95Duration', key: 'p95', width: 60, render: (v: number) => `${v}ms` },
  ];
  return <Table rowKey="url" columns={columns} dataSource={data.slice(0, 10)} loading={loading} size="small" pagination={false} />;
}

// ============ Main Page ============

export function HealthMonitorPage() {
  const [services, setServices] = useState<ServiceHealth[]>(INFRA_SERVICES);
  const [lastCheck, setLastCheck] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState(24);

  // Store-backed health data — MSW provides mock fallback in dev
  const { dashboard, loading, status, fetchDashboard, fetchHealth } = useHealthStore();

  const checkHealth = useCallback(async () => {
    // Fetch backend health check via store (Tracker Admin is self-monitoring)
    await fetchHealth();

    // Build Tracker Admin status from store health check
    const adminStatus: ServiceHealth = {
      name: 'Tracker Admin',
      url: '/actuator/health',
      status: status?.status === 'UP' ? 'UP' : status?.status === 'DEGRADED' ? 'DOWN' : 'DOWN',
      details: status?.components || {},
    };

    // Probe external infrastructure directly (cross-origin health endpoints)
    const results = await Promise.all(
      services.map(async (svc) => {
        try {
          const resp = await fetch(svc.url, { signal: AbortSignal.timeout(5000) });
          const text = await resp.text();
          if (svc.name === 'ClickHouse') return { ...svc, status: text.includes('1') ? ('UP' as const) : ('DOWN' as const) };
          const json = JSON.parse(text);
          return { ...svc, status: ((json.status || 'DOWN') as 'UP' | 'DOWN'), details: json.components || json };
        } catch { return { ...svc, status: 'DOWN' as const }; }
      }),
    );
    setServices([adminStatus, ...results]);
    setLastCheck(dayjs().format('HH:mm:ss'));
  }, [services, fetchHealth, status]);

  useEffect(() => {
    checkHealth();
    fetchDashboard(timeRange);
    const t = setInterval(checkHealth, 30000);
    return () => clearInterval(t);
  }, []);

  const upCount = services.filter(s => s.status === 'UP').length;
  const downCount = services.filter(s => s.status === 'DOWN').length;
  const sIcon = (s: string) => s === 'loading' ? <SyncOutlined spin /> :
    s === 'UP' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  const sTag = (s: string) => s === 'loading' ? <Tag icon={<SyncOutlined spin />} color="processing">检查中</Tag> :
    s === 'UP' ? <Tag color="success">正常</Tag> : <Tag color="error">异常</Tag>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <DashboardOutlined style={{ fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>系统健康监控</Title>
          <Tag color="blue">每 30s 刷新</Tag>
          {lastCheck && <Tag>上次: {lastCheck}</Tag>}
        </Space>
        <Space>
          <Text style={{ fontSize: 12, color: '#999' }}>数据范围:</Text>
          <Select value={timeRange} size="small" style={{ width: 110 }} onChange={setTimeRange}
            options={[
              { label: '近 1 小时', value: 1 }, { label: '近 6 小时', value: 6 },
              { label: '近 24 小时', value: 24 }, { label: '近 7 天', value: 168 },
            ]}
          />
        </Space>
      </div>

      {/* Infrastructure bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size="large">
              {services.map(svc => (
                <Space key={svc.name} size={4}>
                  {sIcon(svc.status)}
                  <Text strong style={{ fontSize: 13 }}>{svc.name}</Text>
                  {sTag(svc.status)}
                </Space>
              ))}
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <Statistic title="正常" value={upCount} suffix={`/ ${services.length}`} valueStyle={{ fontSize: 16, color: '#52c41a' }} />
              {downCount > 0 && <Statistic title="异常" value={downCount} valueStyle={{ fontSize: 16, color: '#ff4d4f' }} />}
            </Space>
          </Col>
        </Row>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        // ===== Overview =====
        {
          key: 'overview', label: <Space><DashboardOutlined />概览</Space>,
          children: (
            <Spin spinning={loading}>
              {!dashboard ? <Empty description="暂无数据" /> : (
                <>
                  {/* Performance metrics */}
                  <Card size="small" title={<Space><ThunderboltOutlined />应用性能 (Core Web Vitals)</Space>}
                    extra={<Text style={{ fontSize: 11, color: '#999' }}>近 {timeRange}h</Text>}
                    style={{ marginBottom: 16 }}>
                    <Row gutter={16}>
                      <Col span={6}><PerfMetricCard data={dashboard.perf.lcp} /></Col>
                      <Col span={6}><PerfMetricCard data={dashboard.perf.fid} /></Col>
                      <Col span={6}><PerfMetricCard data={dashboard.perf.cls} /></Col>
                      <Col span={6}><PerfMetricCard data={dashboard.perf.pageLoad} /></Col>
                    </Row>
                  </Card>

                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    {/* Pipeline */}
                    <Col span={8}>
                      <Card size="small" title="采集管道">
                        <Row gutter={[8, 12]}>
                          <Col span={12}><Statistic title="事件速率" value={dashboard.pipeline.eventsPerMinute} suffix="/min" valueStyle={{ fontSize: 18 }} /></Col>
                          <Col span={12}>
                            <Statistic title="Kafka Lag" value={dashboard.pipeline.kafkaLag}
                              valueStyle={{ fontSize: 18, color: dashboard.pipeline.kafkaLag > 100 ? '#ff4d4f' : '#52c41a' }} />
                          </Col>
                          <Col span={12}>
                            <Statistic title="DLQ 堆积" value={dashboard.pipeline.dlqSize}
                              valueStyle={{ fontSize: 18, color: dashboard.pipeline.dlqSize > 10 ? '#faad14' : '#52c41a' }} />
                          </Col>
                          <Col span={12}>
                            <Statistic title="去重率" value={`${(dashboard.pipeline.dedupRate * 100).toFixed(1)}%`} valueStyle={{ fontSize: 18 }} />
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                    {/* Data Quality */}
                    <Col span={8}>
                      <Card size="small" title="数据质量">
                        <Row gutter={[8, 12]}>
                          <Col span={12}>
                            <Statistic title="今日事件" value={dashboard.dataQuality.totalEventsToday} valueStyle={{ fontSize: 18 }}
                              formatter={(v) => typeof v === 'number' ? (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString()) : String(v)} />
                          </Col>
                          <Col span={12}>
                            <Statistic title="事件类型" value={dashboard.dataQuality.eventTypes} valueStyle={{ fontSize: 18 }} />
                          </Col>
                          <Col span={24}>
                            <div style={{ fontSize: 12, color: '#666' }}>
                              字段空值率: <Progress
                                percent={Math.round(dashboard.dataQuality.avgFieldNullRate * 100)} size="small"
                                strokeColor={dashboard.dataQuality.avgFieldNullRate > 0.1 ? '#ff4d4f' : '#52c41a'}
                                style={{ width: 120, display: 'inline-block' }} />
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                    {/* Error/API summary */}
                    <Col span={8}>
                      <Card size="small" title={<Space><BugOutlined />错误 & API 概览</Space>}>
                        <Row gutter={[8, 12]}>
                          <Col span={12}>
                            <Statistic title="24h JS 异常" value={dashboard.errors.total24h}
                              valueStyle={{ fontSize: 18, color: dashboard.errors.total24h > 100 ? '#ff4d4f' : '#faad14' }} />
                          </Col>
                          <Col span={12}>
                            <Statistic title="JS 错误率" value={`${(dashboard.errors.errorRate * 100).toFixed(2)}%`}
                              valueStyle={{ fontSize: 18, color: dashboard.errors.errorRate > 0.05 ? '#ff4d4f' : '#52c41a' }} />
                          </Col>
                          <Col span={12}>
                            <Statistic title="API 调用量" value={dashboard.apiCalls.totalCalls24h} valueStyle={{ fontSize: 18 }}
                              formatter={(v) => typeof v === 'number' ? (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString()) : String(v)} />
                          </Col>
                          <Col span={12}>
                            <Statistic title="API 错误率" value={`${(dashboard.apiCalls.overallErrorRate * 100).toFixed(2)}%`}
                              valueStyle={{ fontSize: 18, color: dashboard.apiCalls.overallErrorRate > 0.05 ? '#ff4d4f' : '#52c41a' }} />
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>
                </>
              )}
            </Spin>
          ),
        },
        // ===== JS Errors =====
        {
          key: 'errors', label: <Space><BugOutlined />JS 异常 ({dashboard?.errors.total24h || 0})</Space>,
          children: (
            <Card size="small" title="JS 异常 TOP 列表" extra={<Badge count={dashboard?.errors.total24h || 0} overflowCount={999} />}>
              <ErrorTable errors={dashboard?.errors.topErrors || []} loading={loading} />
            </Card>
          ),
        },
        // ===== API Calls =====
        {
          key: 'api', label: <Space><ApiOutlined />接口监控</Space>,
          children: (
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="错误率最高 TOP 10">
                  <ApiTable data={dashboard?.apiCalls.topErrorEndpoints || []} loading={loading} type="error" />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="响应最慢 TOP 10">
                  <ApiTable data={dashboard?.apiCalls.topSlowEndpoints || []} loading={loading} type="slow" />
                </Card>
              </Col>
            </Row>
          ),
        },
        // ===== Infrastructure =====
        {
          key: 'infra', label: <Space><WarningOutlined />基础设施</Space>,
          children: (
            <Row gutter={[16, 16]}>
              {services.map(svc => (
                <Col key={svc.name} xs={24} sm={8}>
                  <Card size="small" title={<Space>{sIcon(svc.status)} {svc.name}</Space>} extra={sTag(svc.status)}>
                    {svc.status === 'loading' ? <Spin /> : (
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="URL"><Text code style={{ fontSize: 11 }}>{svc.url}</Text></Descriptions.Item>
                        <Descriptions.Item label="状态">{svc.status}</Descriptions.Item>
                        {svc.details && svc.name === 'Tracker Admin' && (
                          <Descriptions.Item label="DB">{(svc.details as Record<string, { status: string }>)?.db?.status || 'N/A'}</Descriptions.Item>
                        )}
                      </Descriptions>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          ),
        },
      ]} />
    </div>
  );
}
