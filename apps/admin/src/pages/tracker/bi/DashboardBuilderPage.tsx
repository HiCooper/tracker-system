import { useState, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Typography, Button, Space, Modal, Select,
  Input, Tag, Empty, Segmented, Drawer, Tooltip, Popconfirm,
} from 'antd';
import {
  PlusOutlined, BarChartOutlined, LineChartOutlined, PieChartOutlined,
  TableOutlined, DownloadOutlined, SaveOutlined, DeleteOutlined,
  NumberOutlined, ClockCircleOutlined,
  SettingOutlined, CopyOutlined, FullscreenOutlined,
  RiseOutlined, FallOutlined, ReloadOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

type WidgetType = 'stat' | 'line' | 'bar' | 'pie' | 'table';

interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  w: number;
  h: number;
  metric?: string;
}

const WIDGET_TYPES: { type: WidgetType; label: string; icon: React.ReactNode }[] = [
  { type: 'stat', label: '指标卡', icon: <NumberOutlined /> },
  { type: 'line', label: '折线图', icon: <LineChartOutlined /> },
  { type: 'bar', label: '柱状图', icon: <BarChartOutlined /> },
  { type: 'pie', label: '饼图', icon: <PieChartOutlined /> },
  { type: 'table', label: '数据表', icon: <TableOutlined /> },
];

const METRICS = [
  { label: '访问人数 (UV)', value: 'uv' },
  { label: '页面浏览 (PV)', value: 'pv' },
  { label: '新增用户', value: 'new_users' },
  { label: '人均时长 (秒)', value: 'avg_duration' },
  { label: '跳出率 (%)', value: 'bounce_rate' },
  { label: '支付人数', value: 'pay_users' },
  { label: '转化率 (%)', value: 'conversion_rate' },
  { label: '分享次数', value: 'shares' },
];

const PIE_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2'];

// ============ Mini chart renderers ============

function MiniLineChart({ data }: { data: { date: string; value: number; value2: number }[] }) {
  const max = Math.max(...data.map(d => Math.max(d.value, d.value2)));
  const h = 100, w = 380;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.value / max) * h}`).join(' ');
  const points2 = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d.value2 / max) * h}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }}>
        <polyline points={points2} fill="none" stroke="#91caff" strokeWidth="2" />
        <polyline points={points} fill="none" stroke="#1677ff" strokeWidth="2" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#bbb' }}>
        {[data[0]?.date, data[Math.floor(data.length/2)]?.date, data[data.length-1]?.date].filter(Boolean).map(d =>
          <span key={d as string}>{d as string}</span>)}
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: { name: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
      {data.map((d, i) => (
        <div key={d.name} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: '#999', marginBottom: 2 }}>{d.value.toLocaleString()}</Text>
          <div style={{ width: '100%', height: `${(d.value/max)*100}px`, background: PIE_COLORS[i%PIE_COLORS.length], borderRadius: '4px 4px 0 0', minWidth: 24 }} />
          <Text style={{ fontSize: 9, marginTop: 4, maxWidth: 50, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</Text>
        </div>
      ))}
    </div>
  );
}

function MiniPieChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let cum = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg viewBox="0 0 100 100" style={{ width: 90, height: 90 }}>
        {data.map((d, i) => {
          const pct = d.value / total;
          const start = cum * 3.6;
          const end = (cum + pct * 100) * 3.6;
          cum += pct * 100;
          const x1 = 50 + 38 * Math.cos((start - 90) * Math.PI / 180);
          const y1 = 50 + 38 * Math.sin((start - 90) * Math.PI / 180);
          const x2 = 50 + 38 * Math.cos((end - 90) * Math.PI / 180);
          const y2 = 50 + 38 * Math.sin((end - 90) * Math.PI / 180);
          return <path key={d.name} d={`M50,50 L${x1},${y1} A38,38 0 ${pct > 0.5 ? 1 : 0},1 ${x2},${y2} Z`} fill={PIE_COLORS[i%PIE_COLORS.length]} />;
        })}
        <circle cx="50" cy="50" r="20" fill="#fff" />
      </svg>
      <div style={{ fontSize: 11 }}>
        {data.map((d, i) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i%PIE_COLORS.length] }} />
            <span>{d.name} {d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTable({ data }: { data: any[] }) {
  if (!data.length) return <Empty />;
  const cols = Object.keys(data[0]);
  return (
    <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
      <thead><tr>{cols.map(c => <th key={c} style={{ textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #f0f0f0', color: '#999' }}>{c}</th>)}</tr></thead>
      <tbody>
        {data.map((row, i) => <tr key={i}>{cols.map(c => <td key={c} style={{ padding: '4px 8px', borderBottom: '1px solid #fafafa' }}>{row[c]}</td>)}</tr>)}
      </tbody>
    </table>
  );
}

// ============ Widget component ============

function WidgetCard({ config, onDelete }: { config: WidgetConfig; onDelete: () => void }) {
  const gridCol = config.type === 'table' ? 3 : config.type === 'line' || config.type === 'bar' ? 2 : 1;

  const renderContent = () => {
    switch (config.type) {
      case 'stat':
        return <Statistic title={config.title} value="—" />;
      case 'line':
      case 'bar':
      case 'pie':
      case 'table':
        return <Empty description="绑定数据源查看图表" />;
      default: return <Empty />;
    }
  };
  return (
    <div style={{ gridColumn: `span ${gridCol}` }}>
      <Card size="small" title={<Text style={{ fontSize: 13 }}>{config.title}</Text>}
        extra={
          <Space size={4}>
            <Tooltip title="刷新"><Button type="text" size="small" icon={<ReloadOutlined />} /></Tooltip>
            <Tooltip title="全屏"><Button type="text" size="small" icon={<FullscreenOutlined />} /></Tooltip>
            <Popconfirm title="移除此组件？" onConfirm={onDelete}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        }>
        {renderContent()}
      </Card>
    </div>
  );
}

const PRESET_DASHBOARDS = [
  { id: 'overview', name: '日常运营总览', widgets: [
    {id:'w1',type:'stat'as const,title:'今日 UV',w:1,h:1},{id:'w2',type:'stat'as const,title:'今日 PV',w:1,h:1},
    {id:'w3',type:'stat'as const,title:'支付人数',w:1,h:1},{id:'w4',type:'stat'as const,title:'转化率',w:1,h:1},
    {id:'w5',type:'line'as const,title:'访问趋势（近 7 日）',w:2,h:1},
    {id:'w6',type:'pie'as const,title:'渠道来源',w:1,h:1},
    {id:'w7',type:'bar'as const,title:'渠道对比',w:2,h:1},
    {id:'w8',type:'table'as const,title:'页面排行',w:3,h:2},
  ]},
  { id: 'convert', name: '转化分析看板', widgets: [
    {id:'c1',type:'stat'as const,title:'总进入',w:1,h:1},{id:'c2',type:'stat'as const,title:'加购人数',w:1,h:1},
    {id:'c3',type:'stat'as const,title:'支付人数',w:1,h:1},{id:'c4',type:'stat'as const,title:'转化率',w:1,h:1},
    {id:'c5',type:'line'as const,title:'转化率趋势',w:3,h:1},
    {id:'c6',type:'table'as const,title:'渠道转化明细',w:3,h:2},
  ]},
];

export function DashboardBuilderPage() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(PRESET_DASHBOARDS[0].widgets);
  const [dashName, setDashName] = useState(PRESET_DASHBOARDS[0].name);
  const [presetKey, setPresetKey] = useState(PRESET_DASHBOARDS[0].id);
  const [addOpen, setAddOpen] = useState(false);
  const [wType, setWType] = useState<WidgetType>('stat');
  const [wTitle, setWTitle] = useState('');
  const [wMetric, setWMetric] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const addWidget = () => {
    setWidgets(prev => [...prev, {
      id: 'w_' + Date.now(), type: wType,
      title: wTitle || WIDGET_TYPES.find(t=>t.type===wType)!.label,
      w: 1, h: 1, metric: wMetric || undefined,
    }]);
    setAddOpen(false); setWTitle(''); setWMetric('');
  };

  const loadPreset = (id: string) => {
    const p = PRESET_DASHBOARDS.find(d => d.id === id);
    if (p) { setWidgets(p.widgets); setDashName(p.name); setPresetKey(id); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>自助分析看板</Title>
          <Input value={dashName} onChange={e => setDashName(e.target.value)} style={{ width: 200, fontWeight: 600 }} variant="borderless" />
          <Tag color="blue">草稿</Tag>
        </Space>
        <Space>
          <Select value={presetKey} style={{ width: 160 }} size="small"
            onChange={loadPreset}
            options={PRESET_DASHBOARDS.map(d => ({ label: d.name, value: d.id }))} />
          <Button icon={<ReloadOutlined />} size="small">刷新</Button>
          <Button icon={<DownloadOutlined />} size="small">导出</Button>
          <Button icon={<SettingOutlined />} size="small" onClick={() => setDrawerOpen(true)}>设置</Button>
          <Button type="primary" icon={<SaveOutlined />} size="small">保存看板</Button>
        </Space>
      </div>

      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <Row gutter={16}>
          <Col span={6}><Statistic title="覆盖指标" value={widgets.length} prefix={<NumberOutlined />} valueStyle={{ fontSize: 18 }} /></Col>
          <Col span={6}><Statistic title="最后更新" value="2 分钟前" valueStyle={{ fontSize: 18 }} /></Col>
          <Col span={6}><Statistic title="数据延迟" value="< 5 分钟" valueStyle={{ fontSize: 18, color: '#52c41a' }} /></Col>
          <Col span={6} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Segmented size="small" options={[{ label: '今日', value: 'today' }, { label: '7天', value: '7d' }, { label: '30天', value: '30d' }]} />
          </Col>
        </Row>
      </Card>

      {widgets.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 80 }}>
          <Empty description="看板为空，添加组件">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加组件</Button>
          </Empty>
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {widgets.map(w => <WidgetCard key={w.id} config={w} onDelete={() => setWidgets(prev => prev.filter(x => x.id !== w.id))} />)}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16, padding: 16, border: '1px dashed #d9d9d9', borderRadius: 8 }}>
            <Button type="dashed" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加组件</Button>
          </div>
        </>
      )}

      <Modal title="添加组件" open={addOpen} onOk={addWidget} onCancel={() => setAddOpen(false)} width={440}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text style={{ fontSize: 12, color: '#999' }}>组件类型</Text>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {WIDGET_TYPES.map(t => (
                <Card key={t.type} size="small" hoverable onClick={() => setWType(t.type)}
                  style={{ cursor: 'pointer', textAlign: 'center', width: 80, border: wType === t.type ? '2px solid #1677ff' : '1px solid #d9d9d9' }}>
                  <div style={{ fontSize: 20 }}>{t.icon}</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>{t.label}</div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <Text style={{ fontSize: 12, color: '#999' }}>标题</Text>
            <Input value={wTitle} onChange={e => setWTitle(e.target.value)} placeholder="如：今日 UV" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text style={{ fontSize: 12, color: '#999' }}>关联指标</Text>
            <Select value={wMetric} onChange={setWMetric} style={{ width: '100%', marginTop: 4 }} placeholder="选择指标" allowClear options={METRICS} />
          </div>
        </Space>
      </Modal>

      <Drawer title="看板设置" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={360}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong style={{ fontSize: 12 }}>看板名称</Text>
            <Input value={dashName} onChange={e => setDashName(e.target.value)} style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12 }}>数据范围</Text>
            <Select defaultValue="7d" style={{ width: '100%', marginTop: 4 }}
              options={[{label:'今日',value:'today'},{label:'昨日',value:'yesterday'},{label:'近7天',value:'7d'},{label:'近30天',value:'30d'}]} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12 }}>自动刷新</Text>
            <Select defaultValue="off" style={{ width: '100%', marginTop: 4 }}
              options={[{label:'关闭',value:'off'},{label:'30秒',value:'30s'},{label:'1分钟',value:'1m'},{label:'5分钟',value:'5m'}]} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12 }}>预设模板</Text>
            {PRESET_DASHBOARDS.map(d => (
              <Card key={d.id} size="small" hoverable onClick={() => { loadPreset(d.id); setDrawerOpen(false); }}
                style={{ marginBottom: 8, cursor: 'pointer', border: presetKey === d.id ? '2px solid #1677ff' : undefined }}>
                <div><Text strong style={{ fontSize: 13 }}>{d.name}</Text></div>
                <Tag style={{ marginTop: 4 }}>{d.widgets.length} 个组件</Tag>
              </Card>
            ))}
          </div>
        </Space>
      </Drawer>
    </div>
  );
}
