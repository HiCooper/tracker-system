import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Tabs, Table, Tag, Space, Select, DatePicker, Button, Input } from 'antd';
import { PlaySquareOutlined, HeatMapOutlined, NodeIndexOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useExperienceStore } from '../../../stores/experienceStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ============ Tab 1: 可视化日志 ============

function SessionReplayTab() {
  const { sessions, sessionsLoading, fetchSessions } = useExperienceStore();

  useEffect(() => {
    fetchSessions({ startTime: dayjs().subtract(1, 'h').toISOString(), endTime: dayjs().toISOString() });
  }, []);

  const cols = [
    { title: '会话 ID', dataIndex: 'id', key: 'id', render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: '用户', dataIndex: 'user', key: 'user' },
    { title: '设备', dataIndex: 'device', key: 'device' },
    { title: '页面数', dataIndex: 'pages', key: 'pages' },
    { title: '时长', dataIndex: 'dur', key: 'dur' },
    { title: '时间', dataIndex: 'ts', key: 'ts', render: (v: string) => dayjs(v).fromNow() },
    { title: '操作', key: 'action', width: 80, render: () => <Button type="link" size="small" icon={<PlaySquareOutlined />}>回放</Button> },
  ];

  const totalPages = sessions.reduce((s, r) => s + r.pages, 0);

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontSize: 12, color: '#666' }}>用户:</span>
          <Input placeholder="用户 ID" style={{ width: 160 }} size="small" />
          <span style={{ fontSize: 12, color: '#666' }}>设备:</span>
          <Select placeholder="全部" style={{ width: 120 }} size="small" allowClear options={['iPhone', 'Android', 'iPad', 'PC'].map((d) => ({ label: d, value: d }))} />
          <RangePicker size="small" defaultValue={[dayjs().subtract(1, 'h'), dayjs()]} />
          <Button type="primary" size="small">查询</Button>
        </Space>
      </Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="今日会话" value={sessions.length > 0 ? sessions.length : '—'} loading={sessionsLoading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="可回放" value={sessions.length > 0 ? sessions.length : '—'} loading={sessionsLoading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="平均时长" value="—" suffix="分" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="均页面数" value={sessions.length > 0 ? (totalPages / sessions.length).toFixed(1) : '—'} loading={sessionsLoading} /></Card></Col>
      </Row>
      <Card size="small" title="最近会话">
        <Table rowKey="id" columns={cols} dataSource={sessions} loading={sessionsLoading} size="small" pagination={false} />
      </Card>
    </div>
  );
}

// ============ Tab 2: 热力图 ============

function HeatmapTab() {
  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontSize: 12, color: '#666' }}>页面:</span>
          <Select placeholder="选择页面" style={{ width: 260 }} size="small" options={[
            { label: '首页', value: '/pages/index' },
            { label: '商品详情', value: '/pages/goods/detail' },
            { label: '分类列表', value: '/pages/category' },
            { label: '购物车', value: '/pages/cart' },
          ]} />
          <span style={{ fontSize: 12, color: '#666' }}>类型:</span>
          <Select defaultValue="click" style={{ width: 100 }} size="small" options={[{ label: '点击', value: 'click' }, { label: '曝光', value: 'exposure' }]} />
          <Button type="primary" size="small">分析</Button>
        </Space>
      </Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="总点击数" value="—" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="热力区域" value="—" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="最热区域" value="—" valueStyle={{ fontSize: 14 }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="未点击区" value="—" /></Card></Col>
      </Row>
      <Card size="small" title="点击热力图">
        <div style={{ height: 400, background: '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'radial-gradient(circle at 20% 30%, #f00 0%, transparent 55%), radial-gradient(circle at 45% 55%, #f80 0%, transparent 40%), radial-gradient(circle at 75% 20%, #f00 0%, transparent 50%), radial-gradient(circle at 30% 75%, #f80 0%, transparent 35%), radial-gradient(circle at 65% 80%, #f80 0%, transparent 30%)' }} />
          <Text style={{ zIndex: 1 }}>选择页面并点击分析查看热力图</Text>
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#999' }}>
          低<div style={{ width: 160, height: 10, borderRadius: 5, background: 'linear-gradient(to right, #00f, #0ff, #0f0, #ff0, #f00)' }} />高
        </div>
      </Card>
    </div>
  );
}

// ============ Tab 3: 转化分析 ============

function ConversionTab() {
  const { conversion, conversionLoading, fetchConversion } = useExperienceStore();

  const handleAnalyze = () => {
    fetchConversion({ startTime: dayjs().subtract(29, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD'), goal: 'purchase' });
  };

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontSize: 12, color: '#666' }}>目标:</span>
          <Select defaultValue="purchase" style={{ width: 140 }} size="small" options={[{ label: '支付成功', value: 'purchase' }, { label: '注册完成', value: 'register' }]} />
          <RangePicker size="small" defaultValue={[dayjs().subtract(29, 'd'), dayjs()]} />
          <Button type="primary" size="small" onClick={handleAnalyze} loading={conversionLoading}>分析</Button>
        </Space>
      </Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="目标转化率" value={conversion.length > 0 ? (conversion[conversion.length - 1].rate * 100).toFixed(1) + '%' : '—'} loading={conversionLoading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="转化人数" value={conversion.length > 0 ? conversion[conversion.length - 1].users : '—'} loading={conversionLoading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="平均时长" value="—" suffix="分" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="最佳路径" value="—" valueStyle={{ fontSize: 12 }} /></Card></Col>
      </Row>
      <Card size="small" title="转化漏斗">
        {conversion.length > 0 ? conversion.map((s, i) => (
          <div key={s.step} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
              <Space>
                <Tag color={i === conversion.length - 1 ? 'green' : 'blue'}>{s.step}</Tag>
                {i > 0 && <Tag color="red" style={{ fontSize: 10 }}>流失 {s.users.toLocaleString()}</Tag>}
              </Space>
              <Text type="secondary">{s.users.toLocaleString()} ({(s.rate * 100).toFixed(1)}%)</Text>
            </div>
            <div style={{ height: 26, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(s.rate * 100, 2)}%`, background: `hsl(${220 - i * 30}, 70%, ${50 + i * 5}%)`, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                <Text style={{ color: '#fff', fontSize: 12 }}>{s.step}</Text>
              </div>
            </div>
          </div>
        )) : (
          <div style={{ height: 300, background: '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>点击"分析"查看转化漏斗</div>
        )}
      </Card>
    </div>
  );
}

// ============ Tab 4: 分析报告 ============

function ReportTab() {
  const { reports, reportsLoading, fetchReports } = useExperienceStore();

  useEffect(() => { fetchReports(); }, []);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="报告数" value={reports.length > 0 ? reports.length : '—'} loading={reportsLoading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="本周生成" value="—" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="订阅用户" value="—" /></Card></Col>
        <Col span={6}><Button type="primary" icon={<FilePdfOutlined />}>生成新报告</Button></Col>
      </Row>
      <Card size="small" title="已有报告">
        {reports.length > 0 ? reports.map((r, i) => (
          <Card key={i} size="small" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Space><FilePdfOutlined style={{ color: '#ff4d4f' }} /><Text strong>{r.name}</Text><Tag>{r.type}</Tag><Tag color={r.status === 'done' ? 'green' : 'processing'}>{r.status === 'done' ? '已生成' : '生成中'}</Tag></Space>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{r.period}</div>
              </div>
              <Space><Text type="secondary" style={{ fontSize: 12 }}>{r.ts}</Text><Button size="small" type="link" disabled={r.status !== 'done'}>下载</Button></Space>
            </div>
          </Card>
        )) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无报告</div>
        )}
      </Card>
    </div>
  );
}

export function ExperienceAnalysisPage() {
  const [tab, setTab] = useState('replay');
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>体验分析</Title>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'replay', label: <Space><PlaySquareOutlined />可视化日志</Space>, children: <SessionReplayTab /> },
        { key: 'heatmap', label: <Space><HeatMapOutlined />热力图</Space>, children: <HeatmapTab /> },
        { key: 'conversion', label: <Space><NodeIndexOutlined />转化分析</Space>, children: <ConversionTab /> },
        { key: 'report', label: <Space><FilePdfOutlined />分析报告</Space>, children: <ReportTab /> },
      ]} />
    </div>
  );
}
