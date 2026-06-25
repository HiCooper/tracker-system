import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Tabs, Table, Tag, Space } from 'antd';
import { TeamOutlined, TagOutlined, UserOutlined } from '@ant-design/icons';
import { usePortraitStore } from '../../../stores/portraitStore';
import type { PortraitDimension } from '../../../services/portraitApi';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const DIM_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2'];

function BarRow({ label, count, pct, maxPct }: { label: string; count: number; pct: number; maxPct: number }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
        <Text>{label}</Text><Text type="secondary">{count.toLocaleString()} ({pct.toFixed(1)}%)</Text>
      </div>
      <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(pct / maxPct) * 100}%`, background: DIM_COLORS[0], borderRadius: 3 }} />
      </div>
    </div>
  );
}

function DimCard({ title, data }: { title: string; data: PortraitDimension[] }) {
  const maxPct = Math.max(...data.map((d) => d.pct), 0.01);
  if (data.length === 0) {
    return <Card size="small" title={title}><div style={{ padding: 20, textAlign: 'center', color: '#999' }}>暂无数据</div></Card>;
  }
  return (
    <Card size="small" title={title}>
      {data.map((d) => (
        <BarRow key={d.value} label={d.label} count={d.count} pct={d.pct} maxPct={maxPct} />
      ))}
    </Card>
  );
}

function BasicPortraitTab() {
  const { basicPortrait, fetchBasicPortrait } = usePortraitStore();

  useEffect(() => {
    fetchBasicPortrait({ startTime: dayjs().subtract(29, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD') });
  }, []);

  const bp = basicPortrait;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><DimCard title="性别分布" data={bp?.gender || []} /></Col>
        <Col span={8}><DimCard title="年龄分布" data={bp?.age || []} /></Col>
        <Col span={8}><DimCard title="地域 TOP 5" data={bp?.region || []} /></Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}><DimCard title="设备类型" data={bp?.device || []} /></Col>
        <Col span={8}><DimCard title="网络类型" data={bp?.network || []} /></Col>
        <Col span={8}><DimCard title="活跃时段" data={bp?.activePeriod || []} /></Col>
      </Row>
    </div>
  );
}

function TagAnalysisTab() {
  const { tags, loading, fetchTagOverview } = usePortraitStore();

  useEffect(() => {
    fetchTagOverview({ startTime: dayjs().subtract(6, 'd').format('YYYY-MM-DD'), endTime: dayjs().format('YYYY-MM-DD') });
  }, []);

  const cols = [
    { title: '标签名称', dataIndex: 'name', key: 'name', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '覆盖用户', dataIndex: 'users', key: 'users', sorter: (a: any, b: any) => a.users - b.users },
    { title: '占比', dataIndex: 'pct', key: 'pct', render: (v: number) => `${v}%` },
    { title: '7 天趋势', dataIndex: 'trend', key: 'trend', render: (v: string) => <Tag color={v === 'up' ? 'red' : 'green'}>{v === 'up' ? '↑ 升' : v === 'down' ? '↓ 降' : '→ 稳'}</Tag> },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="标签总数" value={tags?.totalTags ?? '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="用户覆盖率" value={tags ? tags.coverageRate + '%' : '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="自动标签" value={tags?.autoTags ?? '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="自定义标签" value={tags?.customTags ?? '—'} loading={loading} /></Card></Col>
      </Row>
      <Card size="small" title="标签列表">
        <Table scroll={{ x: 'max-content' }} rowKey="name" columns={cols} dataSource={tags?.tagList || []} loading={loading} size="small" pagination={false} />
      </Card>
    </div>
  );
}

function CrowdAnalysisTab() {
  const { crowds, loading, fetchCrowdOverview } = usePortraitStore();

  useEffect(() => { fetchCrowdOverview(); }, []);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="人群包数量" value={crowds?.totalCrowds ?? '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="最大人群" value={crowds?.maxCrowdSize ?? '—'} suffix={crowds ? '人' : undefined} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="今日新增" value={crowds?.todayNew ?? '—'} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="运行中" value={crowds?.running ?? '—'} loading={loading} /></Card></Col>
      </Row>
      <Card size="small" title="已保存人群包">
        {crowds?.crowdList && crowds.crowdList.length > 0 ? crowds.crowdList.map((c) => (
          <Card key={c.name} size="small" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><Text strong>{c.name}</Text><div style={{ fontSize: 12, color: '#999' }}>{c.desc}</div></div>
              <Space><Tag color="blue">{c.users.toLocaleString()} 人</Tag><Text type="secondary" style={{ fontSize: 11 }}>{c.ts}</Text></Space>
            </div>
          </Card>
        )) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无人群包数据</div>
        )}
      </Card>
    </div>
  );
}

export function PortraitInsightPage() {
  const [tab, setTab] = useState('basic');
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>画像洞察</Title>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'basic', label: <Space><UserOutlined />基础画像</Space>, children: <BasicPortraitTab /> },
        { key: 'tag', label: <Space><TagOutlined />标签分析</Space>, children: <TagAnalysisTab /> },
        { key: 'crowd', label: <Space><TeamOutlined />人群分析</Space>, children: <CrowdAnalysisTab /> },
      ]} />
    </div>
  );
}
