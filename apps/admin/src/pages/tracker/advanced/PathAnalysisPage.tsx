import { useEffect, useState } from 'react';
import { Card, Row, Col, DatePicker, Typography, Breadcrumb, Table, Button, Input, Select, Slider, Statistic, Space, Divider, Tag, Spin, Tabs, Progress } from 'antd';
import { HomeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { AdvancedNav } from './AdvancedNav';
import type { ColumnsType } from 'antd/es/table';
import { useAdvancedAnalysisStore } from '../../../stores/advancedAnalysisStore';
import { useSetupStore } from '../../../stores/setupStore';
import { PathSankeyChart } from '../../../components/charts/PathSankeyChart';
import type { TopPath } from '../../../types/advancedAnalysis';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#f5222d', '#faad14'];

function exitRateColor(rate: number): string {
  if (rate > 0.5) return '#ff4d4f';
  if (rate > 0.3) return '#faad14';
  return '#52c41a';
}

export function PathAnalysisPage() {
  const { appCode } = useParams<{ appCode: string }>();
  const { apps, fetchApps } = useSetupStore();
  const { pathNodes, pathTransitions, pathTopPaths, pathSummary, loading, timeRange, setTimeRange, fetchPath } =
    useAdvancedAnalysisStore();

  useEffect(() => { fetchApps(); }, []);

  const appName = apps.find(a => a.appCode === appCode)?.appName || appCode;

  const [startPage, setStartPage] = useState('');
  const [depth, setDepth] = useState(5);
  const [minTransitionCount, setMinTransitionCount] = useState(50);
  const [platform, setPlatform] = useState('');
  const [analyzed, setAnalyzed] = useState(false);
  const [activeTab, setActiveTab] = useState('sankey');

  const handleAnalyze = async () => {
    await fetchPath({ appCode,
      startPage: startPage || undefined,
      depth,
      platform: platform || undefined,
      minTransitionCount,
    });
    setAnalyzed(true);
  };

  useEffect(() => {
    if (analyzed) handleAnalyze();
  }, [timeRange]);

  const topPathColumns: ColumnsType<TopPath> = [
    {
      title: '路径序列', dataIndex: 'path', key: 'path',
      render: (path: string[]) => (
        <Space size={4} wrap>
          {path.map((p, i) => (
            <span key={i}>
              <Tag color={COLORS[i % COLORS.length]} style={{ margin: 1 }}>{p}</Tag>
              {i < path.length - 1 && <span style={{ color: '#bbb' }}>→</span>}
            </span>
          ))}
        </Space>
      ),
    },
    { title: '次数', dataIndex: 'count', key: 'count', width: 100, render: (v: number) => v.toLocaleString() },
    { title: '用户数', dataIndex: 'users', key: 'users', width: 100, render: (v: number) => v.toLocaleString() },
    { title: '占比', dataIndex: 'rate', key: 'rate', width: 80, render: (v: number) => `${(v * 100).toFixed(1)}%` },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/advanced"><HomeOutlined /> 高级分析</Link> },
        { title: appName || appCode || '' },
        { title: '路径分析' },
      ]} />

      <AdvancedNav appCode={appCode} active="path" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>用户路径分析</Title>
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
            <span style={{ fontSize: 12, color: '#666' }}>起始页面:</span>
            <Input value={startPage} style={{ width: 160 }} onChange={(e) => setStartPage(e.target.value)} placeholder="可选，留空查看全局" allowClear />
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>路径深度:</span>
            <Slider value={depth} style={{ width: 140 }} min={2} max={8} onChange={setDepth} />
            <span style={{ fontSize: 12, color: '#999', width: 20 }}>{depth}</span>
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>最小转化数:</span>
            <Input value={String(minTransitionCount)} style={{ width: 100 }} onChange={(e) => { const v = Number(e.target.value); if (v >= 10) setMinTransitionCount(v); }} />
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>平台:</span>
            <Select value={platform} style={{ width: 100 }} onChange={setPlatform} allowClear placeholder="全部"
              options={[{ label: 'Web', value: 'web' }, { label: 'Mobile', value: 'mobile' }]}
            />
          </Space>
        </Space>
        <Divider style={{ margin: '12px 0' }} />
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleAnalyze} loading={loading}>分析</Button>
      </Card>

      {!analyzed && !loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>配置参数并点击"分析"查看用户路径</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* Summary */}
          {pathSummary && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Card size="small"><Statistic title="总 Session 数" value={pathSummary.totalSessions.toLocaleString()} /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="平均路径深度" value={pathSummary.avgPathDepth} suffix="页" /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="去重页面数" value={pathNodes.length} /></Card></Col>
            </Row>
          )}

          <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
            // ===== Tab 1: Sankey Flow =====
            {
              key: 'sankey',
              label: 'Sankey 流转图',
              children: (
                <>
                  <Card style={{ marginBottom: 16 }}>
                    <PathSankeyChart nodes={pathNodes} transitions={pathTransitions} loading={loading} height={500} />
                  </Card>
                  <Card title="热门路径 TOP 20" size="small">
                    <Table
                      bordered
                      columns={topPathColumns}
                      dataSource={pathTopPaths}
                      rowKey={(r) => r.path.join('->')}
                      loading={loading}
                      pagination={false}
                      size="small"
                    />
                  </Card>
                </>
              ),
            },
            // ===== Tab 2: User Journey Map =====
            {
              key: 'journey',
              label: '用户旅程地图',
              children: (
                <Card size="small">
                  {pathTopPaths.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无数据</div>
                  ) : (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, marginBottom: 16, display: 'block' }}>
                        展示用户从进入到离开的典型路径，每条路径按步骤展开
                      </Text>
                      {pathTopPaths.slice(0, 5).map((p, idx) => (
                        <Card key={idx} size="small" style={{ marginBottom: 12 }}
                          title={
                            <Space>
                              <Tag color={COLORS[idx % COLORS.length]}>路径 {idx + 1}</Tag>
                              <Text style={{ fontSize: 12 }}>{p.users.toLocaleString()} 用户 · {(p.rate * 100).toFixed(1)}%</Text>
                            </Space>
                          }>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
                            {p.path.map((step, si) => (
                              <span key={si} style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{
                                  padding: '6px 14px', borderRadius: 20,
                                  background: si === 0 ? '#e6f4ff' : si === p.path.length - 1 ? '#f6ffed' : '#fff7e6',
                                  border: `1px solid ${si === 0 ? '#91caff' : si === p.path.length - 1 ? '#b7eb8f' : '#ffd591'}`,
                                  fontSize: 12, whiteSpace: 'nowrap',
                                }}>
                                  {step}
                                </div>
                                {si < p.path.length - 1 && (
                                  <div style={{
                                    width: 40, height: 2, background: '#d9d9d9', margin: '0 4px',
                                    position: 'relative',
                                  }}>
                                    <div style={{
                                      position: 'absolute', right: -3, top: -3,
                                      width: 0, height: 0,
                                      borderTop: '4px solid transparent',
                                      borderBottom: '4px solid transparent',
                                      borderLeft: '6px solid #d9d9d9',
                                    }} />
                                  </div>
                                )}
                              </span>
                            ))}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              ),
            },
            // ===== Tab 3: Drop-off Analysis =====
            {
              key: 'dropoff',
              label: '流失节点分析',
              children: (
                <Card size="small">
                  {pathNodes.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无数据</div>
                  ) : (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, marginBottom: 16, display: 'block' }}>
                        分析每个页面的流入/流出，高流失节点需要关注
                      </Text>
                      {pathNodes
                        .map((node) => {
                          const inflow = pathTransitions.filter((t) => t.target === node.name).reduce((s, t) => s + t.count, 0);
                          const outflow = pathTransitions.filter((t) => t.source === node.name).reduce((s, t) => s + t.count, 0);
                          const exitRate = inflow > 0 ? Math.max(0, 1 - outflow / Math.max(inflow, 1)) : 0;
                          return { ...node, inflow, outflow, exitRate };
                        })
                        .sort((a, b) => b.exitRate - a.exitRate)
                        .slice(0, 15)
                        .map((node, idx) => (
                          <div key={node.name} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                              <Space size={4}>
                                <Tag color={exitRateColor(node.exitRate)}>{node.name}</Tag>
                                {idx < 3 && <Tag color="red" style={{ fontSize: 10 }}>高流失</Tag>}
                              </Space>
                              <Text style={{ fontSize: 11, color: '#999' }}>
                                流入 {node.inflow.toLocaleString()} → 流出 {node.outflow.toLocaleString()} · 流失率 {(node.exitRate * 100).toFixed(1)}%
                              </Text>
                            </div>
                            <Progress
                              percent={Math.round(node.exitRate * 100)}
                              size="small"
                              strokeColor={exitRateColor(node.exitRate)}
                              format={() => `${(node.exitRate * 100).toFixed(1)}%`}
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </Card>
              ),
            },
          ]} />
        </>
      )}
    </div>
  );
}
