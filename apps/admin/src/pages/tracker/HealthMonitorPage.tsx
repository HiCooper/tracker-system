import { useEffect, useState, useCallback } from 'react';
import {
  Card, Row, Col, Statistic, Typography, Tag, Spin, Space, Table, Descriptions, Progress,
  Tabs, Select, Empty, Alert,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  ThunderboltOutlined, BugOutlined, ApiOutlined, DashboardOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { RecentErrorEvent } from '../../services/healthApi';
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

/** 数值展示:null/undefined 统一显示为「未采集」,避免渲染崩溃与编造数值。 */
function num(v: number | null | undefined): string {
  return v == null ? '未采集' : (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString());
}

/** 无采集来源板块的占位:展示后端给出的 reason,而非伪造数据。 */
function UnavailablePanel({ reason }: { reason?: string }) {
  return (
    <Alert
      type="info"
      showIcon
      message="该指标暂无采集来源"
      description={reason || '采集链路未接入,接入后此处将展示真实数据。'}
      style={{ margin: '8px 0' }}
    />
  );
}

function RecentErrorTable({ errors, loading }: { errors: RecentErrorEvent[]; loading: boolean }) {
  const columns = [
    { title: '事件 ID', dataIndex: 'eventId', key: 'eventId', width: 200, ellipsis: true,
      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: '页面', dataIndex: 'pageUrl', key: 'pageUrl', ellipsis: true,
      render: (v: string) => <Text style={{ fontSize: 12 }} ellipsis>{v || '—'}</Text> },
    { title: '详情', dataIndex: 'properties', key: 'properties', ellipsis: true, width: 280,
      render: (v: string) => <Text code style={{ fontSize: 11, maxWidth: 260, display: 'inline-block' }} ellipsis>{v || '—'}</Text> },
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 150,
      render: (v: string) => <Text style={{ fontSize: 11, color: '#999' }}>{v ? dayjs(v).fromNow() : '—'}</Text> },
  ];
  return (
    <Table rowKey="eventId" columns={columns} dataSource={errors} loading={loading} size="small"
      pagination={false} locale={{ emptyText: <Empty description="近期无 error 事件" /> }} />
  );
}

// ============ Main Page ============

export function HealthMonitorPage() {
  const [services, setServices] = useState<ServiceHealth[]>(INFRA_SERVICES);
  const [lastCheck, setLastCheck] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState(24);

  const { dashboard, loading, fetchDashboard, fetchHealth } = useHealthStore();

  const checkHealth = useCallback(async () => {
    // Tracker Admin 自监控:经 store 拉取后端 /monitor/health
    await fetchHealth();
    const latest = useHealthStore.getState().status;
    const adminStatus: ServiceHealth = {
      name: 'Tracker Admin',
      url: '/actuator/health',
      status: latest?.status === 'UP' ? 'UP' : 'DOWN',
      details: latest?.components || {},
    };

    // 直接探测外部基础设施(跨域健康端点)
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
  }, [services, fetchHealth]);

  useEffect(() => {
    checkHealth();
    fetchDashboard(timeRange);
    const t = setInterval(() => { checkHealth(); fetchDashboard(timeRange); }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const upCount = services.filter(s => s.status === 'UP').length;
  const downCount = services.filter(s => s.status === 'DOWN').length;
  const sIcon = (s: string) => s === 'loading' ? <SyncOutlined spin /> :
    s === 'UP' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  const sTag = (s: string) => s === 'loading' ? <Tag icon={<SyncOutlined spin />} color="processing">检查中</Tag> :
    s === 'UP' ? <Tag color="success">正常</Tag> : <Tag color="error">异常</Tag>;

  const pipeline = dashboard?.pipeline;
  const dq = dashboard?.dataQuality;
  const recentErrors = dashboard?.errors?.recent || [];
  const collectorOk = pipeline?.collectorMetricsAvailable;

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
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  {/* Pipeline (real) */}
                  <Col span={8}>
                    <Card size="small" title="采集管道"
                      extra={pipeline?.available ? <Tag color="success">实时</Tag> : <Tag color="default">CH 不可达</Tag>}>
                      <Row gutter={[8, 12]}>
                        <Col span={12}><Statistic title="事件速率 (/min)" value={num(pipeline?.eventsPerMinute)} valueStyle={{ fontSize: 18 }} /></Col>
                        <Col span={12}><Statistic title="CH 总行数" value={num(pipeline?.clickhouseRows)} valueStyle={{ fontSize: 18 }} /></Col>
                        <Col span={12}>
                          <Statistic title="DLQ 堆积" value={collectorOk ? num(pipeline?.dlqSize) : '未上报'}
                            valueStyle={{ fontSize: 18, color: (pipeline?.dlqSize ?? 0) > 10 ? '#faad14' : undefined }} />
                        </Col>
                        <Col span={12}>
                          <Statistic title="去重率"
                            value={collectorOk && pipeline?.dedupRate != null ? `${(pipeline.dedupRate * 100).toFixed(1)}%` : '未上报'}
                            valueStyle={{ fontSize: 18 }} />
                        </Col>
                        <Col span={24}>
                          <Text style={{ fontSize: 12, color: '#999' }}>
                            Kafka Lag: {pipeline?.kafkaLag == null ? <Tag style={{ marginLeft: 4 }}>未采集</Tag> : pipeline.kafkaLag}
                          </Text>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                  {/* Data Quality (real) */}
                  <Col span={8}>
                    <Card size="small" title="数据质量"
                      extra={dq?.available ? <Tag color="success">实时</Tag> : <Tag color="default">CH 不可达</Tag>}>
                      <Row gutter={[8, 12]}>
                        <Col span={12}><Statistic title="今日事件" value={num(dq?.totalEventsToday)} valueStyle={{ fontSize: 18 }} /></Col>
                        <Col span={12}><Statistic title="事件类型" value={num(dq?.eventTypes)} valueStyle={{ fontSize: 18 }} /></Col>
                        <Col span={24}>
                          <div style={{ fontSize: 12, color: '#666' }}>
                            user_id 空值率:{' '}
                            {dq?.avgFieldNullRate == null ? <Tag>未采集</Tag> : (
                              <Progress
                                percent={Math.round(dq.avgFieldNullRate * 100)} size="small"
                                strokeColor={dq.avgFieldNullRate > 0.5 ? '#faad14' : '#52c41a'}
                                style={{ width: 120, display: 'inline-block' }} />
                            )}
                          </div>
                          <Text style={{ fontSize: 11, color: '#bbb' }}>匿名用户 user_id 为空属正常,仅供参考</Text>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                  {/* Recent errors summary (real) */}
                  <Col span={8}>
                    <Card size="small" title={<Space><BugOutlined />近期 error 事件</Space>}
                      extra={<Tag>{recentErrors.length}</Tag>}>
                      {recentErrors.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近期无 error 事件" /> : (
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          {recentErrors.slice(0, 5).map(e => (
                            <Text key={e.eventId} ellipsis style={{ fontSize: 12 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(e.timestamp).format('HH:mm')}</Text>{' '}
                              {e.pageUrl || e.eventId}
                            </Text>
                          ))}
                        </Space>
                      )}
                    </Card>
                  </Col>
                </Row>
              )}
            </Spin>
          ),
        },
        // ===== Recent error events =====
        {
          key: 'errors', label: <Space><BugOutlined />error 事件 ({recentErrors.length})</Space>,
          children: (
            <Card size="small" title="近期 error 类型事件(直查 ClickHouse)">
              <RecentErrorTable errors={recentErrors} loading={loading} />
            </Card>
          ),
        },
        // ===== Performance (Web Vitals) — not collected yet =====
        {
          key: 'perf', label: <Space><ThunderboltOutlined />应用性能</Space>,
          children: (
            <Card size="small" title="应用性能 (Core Web Vitals)">
              <UnavailablePanel reason={(dashboard?.perf as { reason?: string })?.reason} />
            </Card>
          ),
        },
        // ===== API calls — not collected yet =====
        {
          key: 'api', label: <Space><ApiOutlined />接口监控</Space>,
          children: (
            <Card size="small" title="API 调用统计">
              <UnavailablePanel reason={(dashboard?.apiCalls as { reason?: string })?.reason} />
            </Card>
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
