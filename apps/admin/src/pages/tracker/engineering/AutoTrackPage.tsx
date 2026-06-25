import { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Typography, Tabs, Table, Tag, Space, Button, Input, Select, message, Switch, Badge } from 'antd';
import {
  ThunderboltOutlined, EyeOutlined, EditOutlined, HistoryOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined, SearchOutlined,
  AimOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useAutoTrackStore, type AutoElement } from '../../../stores/autoTrackStore';

const { Title, Text } = Typography;

// ============ Tab 1: 无埋点事件管理 ============

function AutoEventManagement() {
  const { elements, loading, fetchElements, nameElement } = useAutoTrackStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unnamed' | 'named'>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { fetchElements(); }, []);

  const filtered = useMemo(() => elements.filter((e) => {
    if (filter === 'unnamed' && e.status === 'named') return false;
    if (filter === 'named' && e.status === 'unnamed') return false;
    if (search && !e.viewPath.toLowerCase().includes(search.toLowerCase()) &&
        !(e.customName || '').toLowerCase().includes(search.toLowerCase()) &&
        !e.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [elements, search, filter]);

  const cols = [
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 60,
      render: (s: string) => s === 'named'
        ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
        : <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
    },
    {
      title: '事件名称', key: 'name', width: 220,
      render: (_: any, r: any) => {
        if (editing === r.code) {
          return (
            <Input size="small" value={editName} autoFocus
              onChange={(e) => setEditName(e.target.value)}
              onPressEnter={() => { message.success(`事件「${editName}」已命名`); setEditing(null); }}
              onBlur={() => setEditing(null)}
              style={{ width: 180 }}
            />
          );
        }
        if (r.customName) return <Text code style={{ fontSize: 12 }}>{r.customName}</Text>;
        return <Tag color="orange">未命名</Tag>;
      },
    },
    { title: '自动编码', dataIndex: 'code', key: 'code', render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v}</Text> },
    { title: 'View Path', dataIndex: 'viewPath', key: 'viewPath', ellipsis: true, render: (v: string) => <Text style={{ fontSize: 11 }} title={v}>{v}</Text> },
    { title: '标签', dataIndex: 'tag', key: 'tag', width: 70, render: (v: string) => <Tag>{v}</Tag> },
    { title: '元素文本', dataIndex: 'text', key: 'text', width: 100, ellipsis: true },
    { title: '页面', dataIndex: 'page', key: 'page', width: 90, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: '总点击', dataIndex: 'clicks', key: 'clicks', width: 80, sorter: (a: any, b: any) => a.clicks - b.clicks, render: (v: number) => v.toLocaleString() },
    { title: '近24h', dataIndex: 'last24h', key: 'last24h', width: 80, render: (v: number) => <Text style={{ color: '#1677ff' }}>{v.toLocaleString()}</Text> },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, r: any) => (
        <Button type="link" size="small" icon={<EditOutlined />}
          onClick={() => { setEditing(r.code); setEditName(r.customName || ''); }}>
          命名
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input placeholder="搜索 View Path / 名称 / 文本" prefix={<SearchOutlined />} style={{ width: 260 }} size="small"
            value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
          <Select value={filter} size="small" style={{ width: 120 }}
            onChange={setFilter}
            options={[
              { label: '全部事件', value: 'all' },
              { label: '未命名', value: 'unnamed' },
              { label: '已命名', value: 'named' },
            ]} />
          <Button type="primary" size="small" icon={<CheckCircleOutlined />}>批量命名</Button>
          <Button size="small" icon={<AimOutlined />}>关联分析模型</Button>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="自动发现事件" value={elements.length} prefix={<ThunderboltOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已命名" value={elements.filter(e => e.status === 'named').length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="未命名" value={elements.filter(e => e.status === 'unnamed').length} valueStyle={{ color: '#faad14' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="今日采集量" value={156000} /></Card></Col>
      </Row>

      <Card size="small" title="自动发现事件列表">
        <Table scroll={{ x: 'max-content' }} rowKey="code" columns={cols} dataSource={filtered} size="small" pagination={{ pageSize: 10, showTotal: (t: number) => `共 ${t} 个事件` }} />
      </Card>
    </div>
  );
}

// ============ Tab 2: 数据回溯 ============

function DataBackfillTab() {
  const { backfillEnabled, setBackfillEnabled, backfillHistory, fetchBackfillHistory } = useAutoTrackStore();
  useEffect(() => { fetchBackfillHistory(); }, []);
  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Switch checked={backfillEnabled} onChange={setBackfillEnabled} />
          <Text strong>全埋点数据回溯</Text>
          <Tag color="blue">强化版功能</Tag>
        </Space>
        <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
          开启后，系统自动记录所有交互元素点击/输入数据，保留 30 天。
          您可以在未来任意时间圈选命名事件，并回溯过去 30 天的历史数据。
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="回溯天数" value={30} suffix="天" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已存储事件" value={8920000} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="存储占用" value="2.3" suffix="GB" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="最早可回溯" value="2026-05-09" valueStyle={{ fontSize: 13 }} /></Card></Col>
      </Row>

      <Card size="small" title="回溯操作历史" style={{ marginBottom: 16 }}>
        <Table scroll={{ x: 'max-content' }} rowKey="date" size="small" pagination={false} dataSource={backfillHistory}
          columns={[
            { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
            { title: '操作', dataIndex: 'action', key: 'action' },
            { title: '事件数', dataIndex: 'events', key: 'events', width: 80 },
            { title: '操作人', dataIndex: 'user', key: 'user', width: 100 },
            {
              title: '状态', dataIndex: 'status', key: 'status', width: 100,
              render: (s: string) => <Badge status={s === 'completed' ? 'success' : 'processing'} text={s === 'completed' ? '已完成' : '进行中'} />,
            },
          ]} />
      </Card>

      <Card size="small" title="回溯规则">
        <Text type="secondary" style={{ fontSize: 12 }}>
          命名事件后，系统自动回溯历史全埋点数据，将匹配的 View Path 历史数据归入命名事件。
          默认回溯 30 天。针对高频页面可配置更长的回溯周期。
        </Text>
        <div style={{ marginTop: 12 }}>
          {[
            { rule: '页面匹配', desc: '自动匹配已命名事件所在页面的所有历史数据', status: 'active' },
            { rule: 'View Path 精确匹配', desc: '匹配完全一致的 View Path（含索引），精确回溯', status: 'active' },
            { rule: 'View Path 模糊匹配', desc: '支持通配符 * 匹配同类元素（如列表项）', status: 'active' },
          ].map((r, i) => (
            <Card key={i} size="small" style={{ marginBottom: 4 }}>
              <Space>
                <Tag color="green">{r.rule}</Tag>
                <Text style={{ fontSize: 12 }}>{r.desc}</Text>
              </Space>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============ Tab 3: 接入配置 ============

function AutoTrackSetup() {
  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Title level={5}>全埋点接入方式</Title>
        <div style={{ fontSize: 13, lineHeight: 2 }}>
          <p><strong>方式一：脚本标签（推荐）</strong></p>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12 }}>
{`<script src="/tracker-sdk.js"
  data-app-code="myapp"
  data-app-key="your-app-key"
  data-auto-track-mode="true">
</script>`}
          </pre>
          <p><strong>方式二：JS API 动态开启</strong></p>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12 }}>
{`GateFlowTracker.enableAutoTrack(true);`}
          </pre>
          <p><strong>方式三：排除特定元素</strong></p>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12 }}>
{`<button data-gf-auto="false">不采集此按钮</button>`}
          </pre>
        </div>
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card size="small" title="自动采集事件类型">
            {[
              { type: 'auto_click', desc: '所有交互元素点击（a, button, input, select, li, div 等）', icon: <AimOutlined /> },
              { type: 'auto_input', desc: '表单输入变化（input, select, textarea）', icon: <EditOutlined /> },
              { type: 'auto_scroll', desc: '页面滚动深度（25%, 50%, 75%, 100%）', icon: <EyeOutlined /> },
            ].map((t) => (
              <div key={t.type} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                {t.icon}<Text code style={{ fontSize: 11 }}>{t.type}</Text><Text style={{ fontSize: 12, color: '#666' }}>{t.desc}</Text>
              </div>
            ))}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" title="与声明式埋点的关系">
            <div style={{ fontSize: 12, lineHeight: 2, color: '#666' }}>
              <p>✅ 全埋点 <strong>不会覆盖</strong> 已用 <code>data-track</code> 标记的元素（声明式优先）</p>
              <p>✅ 已标记 <code>data-track</code> 的元素走精确上报通道（含 SPM 层级和业务属性）</p>
              <p>✅ 全埋点数据为 <strong>辅助通道</strong>，用于事后发现和回溯</p>
              <p>✅ 推荐的组合策略：核心转化路径用声明式，长尾页面用全埋点覆盖</p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export function AutoTrackPage() {
  const [tab, setTab] = useState('events');
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        <Space><ThunderboltOutlined />全埋点管理</Space>
      </Title>
      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'events',
          label: <Space><AimOutlined />事件发现</Space>,
          children: <AutoEventManagement />,
        },
        {
          key: 'backfill',
          label: <Space><HistoryOutlined />数据回溯</Space>,
          children: <DataBackfillTab />,
        },
        {
          key: 'setup',
          label: <Space><ClockCircleOutlined />接入配置</Space>,
          children: <AutoTrackSetup />,
        },
      ]} />
    </div>
  );
}
