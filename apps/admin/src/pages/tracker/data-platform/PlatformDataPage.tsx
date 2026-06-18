import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Tabs, Table, Tag, Space, DatePicker } from 'antd';
import {
  ThunderboltOutlined, RiseOutlined, FallOutlined, EyeOutlined,
  ClockCircleOutlined, FileTextOutlined, AlertOutlined,
} from '@ant-design/icons';
import { usePlatformDataStore } from '../../../stores/platformDataStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

function CoreDataTab() {
  const { coreMetrics, channels, pages, fetchCoreMetrics, loading } = usePlatformDataStore();

  useEffect(() => {
    fetchCoreMetrics({ startTime: dayjs().subtract(6, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD') });
  }, []);

  const m = coreMetrics;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="访问人数 (UV)" value={m?.uv ?? '—'} loading={loading} suffix={m ? <RiseOutlined style={{ color: '#52c41a', fontSize: 14 }} /> : undefined} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="打开次数" value={m?.sessions ?? '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="访问页面数 (PV)" value={m?.pv ?? '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="新用户数" value={m?.newUsers ?? '—'} loading={loading} /></Card></Col>
      </Row>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="人均访问时长" value={m?.avgDuration ?? '—'} suffix={m ? '秒' : undefined} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="人均访问深度" value={m?.avgDepth ?? '—'} suffix={m ? '页' : undefined} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="跳出率" value={m ? m.bounceRate + '%' : '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="支付转化率" value={m ? m.conversionRate + '%' : '—'} loading={loading} /></Card></Col>
      </Row>
      <Card size="small" title="核心指标趋势（近 7 天）" style={{ marginBottom: 16 }}>
        <div style={{ height: 240, background: '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>趋势图 — 接入后端数据后展示</div>
      </Card>
      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="访问来源 TOP 5">
            {channels.length > 0 ? channels.map((s, i) => (
              <div key={s.channel} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space><Tag color={['blue', 'green', 'orange', 'purple', 'cyan'][i]}>{i + 1}</Tag>{s.channel}</Space>
                <Text style={{ color: '#999' }}>{s.uv.toLocaleString()} 人</Text>
              </div>
            )) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无数据</div>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="访问页面 TOP 5">
            {pages.length > 0 ? pages.map((s, i) => (
              <div key={s.path} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                <Space><Tag color={['blue', 'green', 'orange', 'purple', 'cyan'][i]}>{i + 1}</Tag>{s.path}</Space>
                <Text style={{ color: '#999' }}>{s.pv.toLocaleString()} PV</Text>
              </div>
            )) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无数据</div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function RealtimeTab() {
  const { realtime, fetchRealtime } = usePlatformDataStore();

  useEffect(() => {
    fetchRealtime();
    const timer = setInterval(() => fetchRealtime(), 30000);
    return () => clearInterval(timer);
  }, []);

  const r = realtime;

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}><Statistic title="实时在线" value={r?.online ?? '—'} valueStyle={{ color: '#52c41a' }} prefix={<ThunderboltOutlined />} /></Col>
          <Col span={6}><Statistic title="今日访问人数" value={r?.todayUv ?? '—'} /></Col>
          <Col span={6}><Statistic title="今日打开次数" value={r?.todaySessions ?? '—'} /></Col>
          <Col span={6}><Statistic title="今日新增用户" value={r?.todayNewUsers ?? '—'} /></Col>
        </Row>
      </Card>
      <Row gutter={16}>
        <Col span={12}><Card size="small" title="实时来源分布"><div style={{ height: 200, background: '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>实时来源饼图</div></Card></Col>
        <Col span={12}>
          <Card size="small" title="实时活跃页面 TOP 10">
            {r?.topPages && r.topPages.length > 0 ? r.topPages.map((s, i) => (
              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Space><Tag>{i + 1}</Tag>{s.name}</Space><Text style={{ color: '#999' }}>{s.count.toLocaleString()} 人</Text>
              </div>
            )) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无数据</div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function AccessAnalysisTab() {
  const { analysis, loading, fetchAnalysis } = usePlatformDataStore();

  useEffect(() => {
    fetchAnalysis({ startTime: dayjs().subtract(6, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD') });
  }, []);

  const a = analysis;
  const cols = [
    { title: '渠道', dataIndex: 'channel', key: 'channel' },
    { title: '访问人数', dataIndex: 'uv', key: 'uv', sorter: (a: any, b: any) => a.uv - b.uv },
    { title: '新用户数', dataIndex: 'newUv', key: 'newUv' },
    { title: '打开次数', dataIndex: 'sessions', key: 'sessions' },
    { title: '人均时长(s)', dataIndex: 'avgDuration', key: 'avgDuration' },
    { title: '跳出率', dataIndex: 'bounceRate', key: 'bounceRate', render: (v: number) => `${v}%` },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}><Card size="small"><Statistic title="日活" value={a?.dau ?? '—'} loading={loading} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="月活" value={a?.mau ?? '—'} loading={loading} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="人均次数" value={a?.avgSessionsPerUser ?? '—'} loading={loading} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="人均时长" value={a?.avgDuration ?? '—'} suffix={a ? '秒' : undefined} loading={loading} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="次均页面" value={a?.avgPagesPerSession ?? '—'} loading={loading} /></Card></Col>
        <Col span={4}><Card size="small"><Statistic title="7 日留存" value={a ? a.day7Retention + '%' : '—'} loading={loading} /></Card></Col>
      </Row>
      <Card size="small" title="访问渠道分析" style={{ marginBottom: 16 }}>
        <Table rowKey="channel" columns={cols} dataSource={a?.channels || []} loading={loading} size="small" pagination={false} />
      </Card>
      <Card size="small" title="访问趋势"><div style={{ height: 200, background: '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>访问趋势图</div></Card>
    </div>
  );
}

function RetentionTab() {
  const { retention, loading, fetchRetention } = usePlatformDataStore();

  useEffect(() => {
    fetchRetention({ startTime: dayjs().subtract(29, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD') });
  }, []);

  const r = retention;
  const days = [1, 2, 3, 7, 14, 30];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="次日留存" value={r?.summary ? (r.summary.day1Rate * 100).toFixed(1) + '%' : '—'} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="7 日留存" value={r?.summary ? (r.summary.day7Rate * 100).toFixed(1) + '%' : '—'} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="30 日留存" value={r?.summary ? (r.summary.day30Rate * 100).toFixed(1) + '%' : '—'} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="活跃 7 日留存" value={r?.summary ? (r.summary.activeDay7Rate * 100).toFixed(1) + '%' : '—'} /></Card></Col>
      </Row>
      <Card size="small" title="新增用户留存表" style={{ marginBottom: 16 }}>
        <Table size="small" pagination={false} dataSource={r?.cohorts || []} loading={loading} rowKey="date"
          columns={[
            { title: '日期', dataIndex: 'date', width: 80, fixed: 'left' as const },
            { title: '新用户', dataIndex: 'users', width: 80 },
            ...days.map((d) => ({
              title: `D${d}`, width: 60,
              render: (_: any, row: any) => {
                const idx = days.indexOf(d);
                if (idx >= row.rates.length) return <Text type="secondary">-</Text>;
                const v = row.rates[idx];
                return <Text style={{ color: v >= 0.3 ? '#52c41a' : v >= 0.2 ? '#faad14' : '#ff4d4f' }}>{(v * 100).toFixed(1)}%</Text>;
              },
            })),
          ]} />
      </Card>
      <Card size="small" title="留存曲线"><div style={{ height: 200, background: '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>留存曲线图</div></Card>
    </div>
  );
}

function PageAnalysisTab() {
  const { analysis, loading, fetchAnalysis } = usePlatformDataStore();

  useEffect(() => {
    fetchAnalysis({ startTime: dayjs().subtract(6, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD') });
  }, []);

  const cols = [
    { title: '页面路径', dataIndex: 'path', key: 'path', render: (v: string) => <Text code>{v}</Text> },
    { title: '访问人数', dataIndex: 'uv', key: 'uv', sorter: (a: any, b: any) => a.uv - b.uv },
    { title: '访问次数', dataIndex: 'pv', key: 'pv' },
    { title: '入口页次数', dataIndex: 'entry', key: 'entry' },
    { title: '退出页次数', dataIndex: 'exit', key: 'exit' },
    { title: '退出率', dataIndex: 'exitRate', key: 'exitRate', render: (v: number) => `${v}%` },
    { title: '人均停留(s)', dataIndex: 'avgStay', key: 'avgStay' },
  ];

  const pages = analysis?.pages || [];
  const totalPv = pages.reduce((s, p) => s + p.pv, 0);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="日访问页面数" value={totalPv > 0 ? totalPv : '—'} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="人均访问深度" value={analysis?.avgPagesPerSession ?? '—'} suffix={analysis ? '页' : undefined} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="7 日留存" value={analysis ? analysis.day7Retention + '%' : '—'} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="人均会话数" value={analysis?.avgSessionsPerUser ?? '—'} /></Card></Col>
      </Row>
      <Card size="small" title="页面访问明细">
        <Table rowKey="path" columns={cols} dataSource={pages} loading={loading} size="small" pagination={false} />
      </Card>
    </div>
  );
}

function AnomalyTab() {
  const { anomalies, fetchAnomalies } = usePlatformDataStore();

  useEffect(() => {
    fetchAnomalies({ date: dayjs().format('YYYY-MM-DD') });
  }, []);

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}><Statistic title="今日访问人数" value={anomalies.length > 0 ? '—' : '—'} suffix={<RiseOutlined style={{ color: '#52c41a' }} />} /></Col>
          <Col span={6}><Statistic title="较昨日变化" value="—" /></Col>
          <Col span={6}><Statistic title="今日支付人数" value="—" /></Col>
          <Col span={6}><Statistic title="较昨日变化" value="—" /></Col>
        </Row>
      </Card>
      <Card size="small" title="异动预警">
        {anomalies.length > 0 ? anomalies.map((a, i) => (
          <Card key={i} size="small" style={{ marginBottom: 8 }}>
            <Space>
              {a.dir === 'up' ? <RiseOutlined style={{ color: '#ff4d4f' }} /> : <FallOutlined style={{ color: '#52c41a' }} />}
              <Text strong>{a.metric}</Text><Tag color={a.dir === 'up' ? 'red' : 'green'}>{a.change}</Tag>
            </Space>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{a.detail}</div>
          </Card>
        )) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无异常数据</div>
        )}
      </Card>
    </div>
  );
}

export function PlatformDataPage() {
  const [tab, setTab] = useState('core');
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>平台数据</Title>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'core', label: <Space><ThunderboltOutlined />核心数据</Space>, children: <CoreDataTab /> },
        { key: 'realtime', label: <Space><ClockCircleOutlined />实时数据</Space>, children: <RealtimeTab /> },
        { key: 'access', label: <Space><EyeOutlined />访问分析</Space>, children: <AccessAnalysisTab /> },
        { key: 'retention', label: <Space><RiseOutlined />留存分析</Space>, children: <RetentionTab /> },
        { key: 'page', label: <Space><FileTextOutlined />页面分析</Space>, children: <PageAnalysisTab /> },
        { key: 'anomaly', label: <Space><AlertOutlined />异动分析</Space>, children: <AnomalyTab /> },
      ]} />
    </div>
  );
}
