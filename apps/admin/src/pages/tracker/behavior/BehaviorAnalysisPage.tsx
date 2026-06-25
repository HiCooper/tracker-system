import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Tabs, Table, Tag, Space, Select, DatePicker, Button, Input } from 'antd';
import { BarChartOutlined, FunnelPlotOutlined, NodeIndexOutlined, RiseOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useBehaviorStore } from '../../../stores/behaviorStore';
import { ChartPlaceholder } from '../../../components/ChartPlaceholder';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

function EventAnalysisTab() {
  const { events, loading, overview, fetchEvents } = useBehaviorStore();

  useEffect(() => {
    fetchEvents({ startTime: dayjs().subtract(13, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD') });
  }, []);

  const cols = [
    { title: '事件名称', dataIndex: 'eventType', key: 'eventType', render: (v: string) => <Tag>{v}</Tag> },
    { title: '触发次数', dataIndex: 'count', key: 'count', sorter: (a: any, b: any) => a.count - b.count },
    { title: '触发人数', dataIndex: 'users', key: 'users' },
    { title: '人均次数', dataIndex: 'avgPerUser', key: 'avgPerUser', render: (v: number) => v.toFixed(1) },
    { title: '趋势', dataIndex: 'trend', key: 'trend', render: (v: number) => <Text style={{ color: v > 0 ? '#52c41a' : '#ff4d4f' }}>{v > 0 ? `+${v}%` : `${v}%`}</Text> },
  ];

  const totalEvents = events.reduce((s, e) => s + e.count, 0);
  const totalUsers = events.length > 0 ? Math.max(...events.map(e => e.users)) : 0;
  const avgPerUser = events.length > 0 ? events.reduce((s, e) => s + e.avgPerUser, 0) / events.length : 0;

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontSize: 12, color: '#666' }}>事件:</span>
          <Select mode="multiple" placeholder="全部事件" style={{ width: 280 }} allowClear
            options={['page_view', 'click', 'exposure', 'add_to_cart', 'purchase', 'share'].map((e) => ({ label: e, value: e }))} />
          <span style={{ fontSize: 12, color: '#666' }}>时间:</span>
          <RangePicker size="small" defaultValue={[dayjs().subtract(13, 'd'), dayjs()]} />
          <Button type="primary" icon={<PlayCircleOutlined />} size="small">分析</Button>
        </Space>
      </Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="总事件量" value={overview ? overview.totalEvents : totalEvents} loading={loading && !overview} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="事件类型数" value={overview ? overview.eventTypeCount : events.length} loading={loading && !overview} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="活跃用户" value={overview ? overview.activeUsers : totalUsers} loading={loading && !overview} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="人均事件数" value={overview ? overview.avgEventsPerUser : avgPerUser} loading={loading && !overview} /></Card></Col>
      </Row>
      <Card size="small" title="事件趋势（近 14 天）" style={{ marginBottom: 16 }}>
        <ChartPlaceholder height={240} description="事件趋势图开发中" />
      </Card>
      <Card size="small" title="事件明细">
        <Table scroll={{ x: 'max-content' }} rowKey="eventType" columns={cols} dataSource={events} loading={loading} size="small" pagination={false} />
      </Card>
    </div>
  );
}

function FunnelTab() {
  const { funnel, loading, fetchFunnel } = useBehaviorStore();

  const handleAnalyze = () => {
    fetchFunnel({ startTime: dayjs().subtract(29, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD') });
  };

  const steps = funnel?.steps || [];
  const totalEntered = funnel?.totalEntered || 0;
  const convRate = funnel ? (funnel.overallConversionRate * 100).toFixed(1) + '%' : '—';
  const maxDrop = funnel?.maxDropStep || '—';
  const medianMinutes = funnel?.medianConversionMinutes || 0;

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontSize: 12, color: '#666' }}>漏斗步骤:</span>
          {['浏览首页', '查看商品', '加入购物车', '提交订单', '支付成功'].map((s, i) => (
            <Space key={i} size={2}>
              <Tag color="blue">{s}</Tag>
              {i < 4 && <Text style={{ color: '#bbb' }}>→</Text>}
            </Space>
          ))}
          <Button type="primary" icon={<PlayCircleOutlined />} size="small" onClick={handleAnalyze} loading={loading}>分析</Button>
        </Space>
      </Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="总进入" value={totalEntered > 0 ? totalEntered : '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="总转化率" value={convRate} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="最大流失" value={maxDrop} valueStyle={{ fontSize: 13 }} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="转化中位数" value={medianMinutes > 0 ? medianMinutes : '—'} suffix={medianMinutes > 0 ? '分' : undefined} loading={loading} /></Card></Col>
      </Row>
      <Card size="small" title="漏斗图">
        {steps.length > 0 ? (
          <div style={{ padding: 16 }}>
            {steps.map((s, i) => (
              <div key={s.step} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                  <Space><Tag color="blue">{s.step}</Tag></Space>
                  <Text type="secondary">{s.users.toLocaleString()} ({(s.rate * 100).toFixed(1)}%)</Text>
                </div>
                <div style={{ height: 26, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(s.rate * 100, 2)}%`, background: `hsl(${220 - i * 30}, 70%, ${50 + i * 5}%)`, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ChartPlaceholder height={300} description={'点击"分析"查看漏斗可视化'} />
        )}
      </Card>
    </div>
  );
}

function PathTab() {
  const { pathData, loading, fetchPath } = useBehaviorStore();

  const handleAnalyze = () => {
    fetchPath({ startTime: dayjs().subtract(13, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD') });
  };

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontSize: 12, color: '#666' }}>起始页面:</span>
          <Input placeholder="全部页面" style={{ width: 160 }} size="small" />
          <span style={{ fontSize: 12, color: '#666' }}>深度:</span>
          <Select value={5} style={{ width: 80 }} size="small" options={[3, 4, 5, 6, 7, 8].map((v) => ({ label: v, value: v }))} />
          <Button type="primary" icon={<PlayCircleOutlined />} size="small" onClick={handleAnalyze} loading={loading}>分析</Button>
        </Space>
      </Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card size="small"><Statistic title="总 Session" value={pathData?.totalSessions ?? '—'} loading={loading} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="平均深度" value={pathData?.avgDepth ?? '—'} suffix={pathData ? '页' : undefined} loading={loading} /></Card></Col>
        <Col span={8}><Card size="small"><Statistic title="页面数" value={pathData?.pageCount ?? '—'} loading={loading} /></Card></Col>
      </Row>
      <Card size="small" title="Sankey 路径图"><ChartPlaceholder height={350} description="路径流转图开发中" /></Card>
    </div>
  );
}

function RetentionBehaviorTab() {
  const { retention, loading, fetchRetention } = useBehaviorStore();

  const handleAnalyze = () => {
    fetchRetention({ startTime: dayjs().subtract(29, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD') });
  };

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontSize: 12, color: '#666' }}>初始事件:</span>
          <Select value="first_login" style={{ width: 140 }} size="small" options={[{ label: '首次登录', value: 'first_login' }, { label: '注册成功', value: 'register' }]} />
          <span style={{ fontSize: 12, color: '#666' }}>回访事件:</span>
          <Select value="app_open" style={{ width: 140 }} size="small" options={[{ label: '打开应用', value: 'app_open' }]} />
          <Button type="primary" icon={<PlayCircleOutlined />} size="small" onClick={handleAnalyze} loading={loading}>分析</Button>
        </Space>
      </Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="初始用户" value={retention?.cohorts[0]?.users ?? '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="次日留存" value={retention ? (retention.day2Rate * 100).toFixed(1) + '%' : '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="7 日留存" value={retention ? (retention.day7Rate * 100).toFixed(1) + '%' : '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="30 日留存" value={retention ? (retention.day30Rate * 100).toFixed(1) + '%' : '—'} loading={loading} /></Card></Col>
      </Row>
      <Card size="small" title="留存曲线"><ChartPlaceholder height={240} description="留存曲线图开发中" /></Card>
    </div>
  );
}

export function BehaviorAnalysisPage() {
  const [tab, setTab] = useState('event');
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>行为分析</Title>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'event', label: <Space><BarChartOutlined />事件分析</Space>, children: <EventAnalysisTab /> },
        { key: 'funnel', label: <Space><FunnelPlotOutlined />漏斗分析</Space>, children: <FunnelTab /> },
        { key: 'path', label: <Space><NodeIndexOutlined />路径分析</Space>, children: <PathTab /> },
        { key: 'retention', label: <Space><RiseOutlined />留存分析</Space>, children: <RetentionBehaviorTab /> },
      ]} />
    </div>
  );
}
