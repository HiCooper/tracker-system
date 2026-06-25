import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Tabs, Table, Tag, Space, Select, DatePicker, Button, Input } from 'antd';
import { PlaySquareOutlined, HeatMapOutlined, NodeIndexOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useExperienceStore } from '../../../stores/experienceStore';
import { useSetupStore } from '../../../stores/setupStore';
import { Link } from 'react-router-dom';
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
        <Table scroll={{ x: 'max-content' }} rowKey="id" columns={cols} dataSource={sessions} loading={sessionsLoading} size="small" pagination={false} />
      </Card>
    </div>
  );
}

// ============ Tab 2: 热力图 ============

function HeatmapTab() {
  const { apps, fetchApps } = useSetupStore();
  useEffect(() => { fetchApps(); }, []);
  return (
    <div>
      <Text type="secondary">选择应用查看真实的点击热力图与用户画像(基于真实采集数据):</Text>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {apps.map((a) => (
          <Col key={a.id} xs={24} sm={12} md={8}>
            <Card size="small" hoverable>
              <Title level={5} style={{ marginBottom: 4 }}>{a.appName}</Title>
              <code style={{ color: '#999', fontSize: 12 }}>{a.appCode}</code>
              <div style={{ marginTop: 12 }}>
                <Link to={`/tracker/experience/${a.appCode}/heatmap`}>点击热力图</Link>
                <span style={{ color: '#ddd', margin: '0 8px' }}>|</span>
                <Link to={`/tracker/experience/${a.appCode}/portrait`}>用户画像</Link>
              </div>
            </Card>
          </Col>
        ))}
        {apps.length === 0 && <Col span={24}><Text type="secondary">暂无应用,请先在「埋点管理」创建应用。</Text></Col>}
      </Row>
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
