import { useState, useEffect, useRef } from 'react';
import {
  Card, Row, Col, Statistic, Typography, Tabs, Table, Tag, Space, Button,
  Select, Badge, Steps, Result,
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined,
  ThunderboltOutlined, PlayCircleOutlined, HistoryOutlined,
  SettingOutlined, CodeOutlined, DownloadOutlined, AimOutlined,
} from '@ant-design/icons';
import { useVerifyStore } from '../../../stores/verifyStore';

const { Title, Text } = Typography;

// ============ Tab 1: Schema Registry ============

function SchemaRegistryTab() {
  const { schemas, fetchSchemas, loading } = useVerifyStore();
  useEffect(() => { fetchSchemas(); }, []);

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" size="small" icon={<ThunderboltOutlined />}>注册事件 Schema</Button>
          <Button size="small" icon={<DownloadOutlined />}>导出</Button>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="已注册事件" value={schemas.length} loading={loading} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已发布" value={schemas.filter((s: { status: string }) => s.status === 'active').length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="草稿" value={schemas.filter((s: { status: string }) => s.status === 'draft').length} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="属性总数" value={schemas.reduce((s: number, ev: { attributes: unknown[] }) => s + ev.attributes.length, 0)} /></Card></Col>
      </Row>

      {schemas.map((schema: { id: string; eventType: string; description: string; required: boolean; status: string; attributes: { name: string; type: string; required: boolean; desc: string; enum?: string[]; range?: { min: number; max: number } }[] }) => (
        <Card key={schema.id} size="small" style={{ marginBottom: 12 }}
          title={
            <Space>
              <Text code style={{ fontSize: 12 }}>{schema.eventType}</Text>
              <Text style={{ fontSize: 13 }}>{schema.description}</Text>
              <Tag color={schema.required ? 'red' : 'default'}>{schema.required ? '核心事件' : '可选事件'}</Tag>
              <Badge status={schema.status === 'active' ? 'success' : 'processing'} text={schema.status === 'active' ? '已发布' : '草稿'} />
            </Space>
          }
          extra={<Space><Button size="small" type="link">编辑</Button><Button size="small" type="link" danger>删除</Button></Space>}
        >
          <Table rowKey="name" size="small" pagination={false}
            dataSource={schema.attributes}
            columns={[
              { title: '属性名', dataIndex: 'name', key: 'name', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
              { title: '类型', dataIndex: 'type', key: 'type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
              { title: '必填', dataIndex: 'required', key: 'required', width: 60,
                render: (v: boolean) => v ? <CheckCircleOutlined style={{ color: '#ff4d4f' }} /> : <Text type="secondary">-</Text> },
              { title: '约束', key: 'constraints', width: 180,
                render: (_: any, r: any) => (
                  <Space size={2}>
                    {r.enum && <Tag color="blue" style={{ fontSize: 10 }}>枚举: {r.enum.join('|')}</Tag>}
                    {r.range && <Tag color="green" style={{ fontSize: 10 }}>范围: {r.range.min}-{r.range.max}</Tag>}
                  </Space>
                ),
              },
              { title: '描述', dataIndex: 'desc', key: 'desc', ellipsis: true },
            ]} />
        </Card>
      ))}
    </div>
  );
}

// ============ Tab 2: Run Verification ============

function RunVerificationTab() {
  const { running, result, runVerification, failures } = useVerifyStore();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const startVerification = () => {
    runVerification(['purchase', 'add_to_cart', 'click']);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" size="small" icon={<PlayCircleOutlined />} loading={running}
            onClick={startVerification}>
            开始验证
          </Button>
          <Select defaultValue="all" size="small" style={{ width: 180 }}
            options={[{ label: '全部已注册事件', value: 'all' }, { label: '仅核心事件', value: 'core' }]} />
          <Select defaultValue="latest" size="small" style={{ width: 140 }}
            options={[{ label: '最新 1000 条', value: 'latest' }, { label: '最近 1 小时', value: '1h' }, { label: '最近 24 小时', value: '24h' }]} />
        </Space>
      </Card>

      {running && (
        <Card size="small" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}><ThunderboltOutlined spin style={{ color: '#1677ff' }} /></div>
          <Text style={{ fontSize: 16 }}>验证引擎运行中...</Text>
          <div style={{ marginTop: 8, color: '#999' }}>
            <Steps size="small" current={1} items={[
              { title: '加载 Schema' }, { title: '获取样本数据' }, { title: '执行验证规则' }, { title: '生成报告' },
            ]} />
          </div>
        </Card>
      )}

      {result && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Card size="small"><Statistic title="总检测项" value={result.results.total} prefix={<AimOutlined />} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="通过" value={result.results.pass} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="失败" value={result.results.fail} valueStyle={{ color: '#ff4d4f' }} prefix={<CloseCircleOutlined />} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="警告" value={result.results.warn} valueStyle={{ color: '#faad14' }} prefix={<ExclamationCircleOutlined />} /></Card></Col>
          </Row>

          <Card size="small" title="验证失败详情" style={{ marginBottom: 16 }}>
            <Table rowKey={(r: any) => r.attr + r.error} size="small" pagination={false}
              dataSource={failures}
              columns={[
                {
                  title: '严重度', dataIndex: 'severity', width: 70,
                  render: (s: string) => s === 'error'
                    ? <Tag color="red" icon={<CloseCircleOutlined />}>错误</Tag>
                    : <Tag color="orange" icon={<ExclamationCircleOutlined />}>警告</Tag>,
                },
                { title: '事件', dataIndex: 'eventType', width: 110, render: (v: string) => <Tag color="blue">{v}</Tag> },
                { title: '属性', dataIndex: 'attr', width: 160, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                {
                  title: '期望值', dataIndex: 'expected', width: 150,
                  render: (v: string) => <Text style={{ color: '#52c41a', fontSize: 11 }}>{v}</Text>,
                },
                {
                  title: '实际值', dataIndex: 'actual', width: 160,
                  render: (v: string) => <Text style={{ color: '#ff4d4f', fontSize: 11 }}>{v}</Text>,
                },
                {
                  title: '错误类型', dataIndex: 'error', width: 120,
                  render: (v: string) => <Tag>{v === 'type_mismatch' ? '类型不匹配' : v === 'enum_mismatch' ? '枚举越界' : v === 'missing_required' ? '必填缺失' : v === 'empty_value' ? '空值' : '范围越界'}</Tag>,
                },
                { title: '详情', dataIndex: 'detail', ellipsis: true },
              ]} />
          </Card>

          <Result
            status={result.results.fail > 0 ? 'warning' : 'success'}
            title={result.results.fail > 0 ? `发现 ${result.results.fail} 个错误` : '全部验证通过'}
            subTitle={`验证耗时 ${result.duration}，覆盖 ${result.events.length} 个事件类型`}
          />
        </>
      )}
    </div>
  );
}

// ============ Tab 3: Verification History ============

function VerificationHistoryTab() {
  const { reports, fetchReports } = useVerifyStore();
  useEffect(() => { fetchReports(); }, []);

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" size="small" icon={<PlayCircleOutlined />}>新建验证任务</Button>
          <Button size="small" icon={<SettingOutlined />}>定时验证配置</Button>
        </Space>
      </Card>

      <Table rowKey="id" size="small"
        dataSource={reports}
        columns={[
          { title: '报告名称', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
          { title: '应用', dataIndex: 'app', width: 90 },
          { title: '验证时间', dataIndex: 'createdAt', width: 140, render: (v: string) => <Text style={{ fontSize: 11 }}>{v}</Text> },
          {
            title: '状态', dataIndex: 'status', width: 80,
            render: (s: string) => <Badge status={s === 'completed' ? 'success' : 'processing'} text={s === 'completed' ? '完成' : '运行中'} />,
          },
          { title: '覆盖事件', dataIndex: 'events', width: 180, render: (v: string[]) => v.map(e => <Tag key={e} style={{ fontSize: 10 }}>{e}</Tag>) },
          {
            title: '结果', key: 'result', width: 170,
            render: (_: any, r: any) => (
              <Space size={4}>
                <Tag color="green">{r.results.pass} 通过</Tag>
                {r.results.fail > 0 && <Tag color="red">{r.results.fail} 失败</Tag>}
                {r.results.warn > 0 && <Tag color="orange">{r.results.warn} 警告</Tag>}
              </Space>
            ),
          },
          { title: '耗时', dataIndex: 'duration', width: 80 },
          {
            title: '操作', width: 100,
            render: (_: any, r: any) => (
              <Space size={2}>
                <Button type="link" size="small" disabled={r.status !== 'completed'}>查看</Button>
                <Button type="link" size="small">下载</Button>
              </Space>
            ),
          },
        ]} />
    </div>
  );
}

// ============ Tab 4: Verification Rules ============

function RulesConfigTab() {
  const rules = [
    { id: 'rule_01', name: '必填字段检查', desc: '验证所有注册为 required=true 的属性是否存在且非空', active: true, severity: 'error' },
    { id: 'rule_02', name: '类型校验', desc: '验证属性值类型与 Schema 定义一致（string/number/boolean）', active: true, severity: 'error' },
    { id: 'rule_03', name: '枚举值校验', desc: '验证属性值在定义的枚举范围内', active: true, severity: 'error' },
    { id: 'rule_04', name: '数值范围校验', desc: '验证数值属性在定义的 min/max 范围内', active: true, severity: 'error' },
    { id: 'rule_05', name: '事件是否注册', desc: '检查上报的事件是否已在 Schema 中注册', active: true, severity: 'warning' },
    { id: 'rule_06', name: '事件是否禁用', desc: '检查事件是否已被标记为禁用', active: false, severity: 'warning' },
    { id: 'rule_07', name: 'Debug 埋点检查', desc: '检查是否有 debug 模式的埋点数据混入生产环境', active: true, severity: 'warning' },
    { id: 'rule_08', name: 'SPM 层级完整性', desc: '验证 SPM 四层级是否完整上报', active: true, severity: 'warning' },
    { id: 'rule_09', name: 'userId/anonymousId', desc: '事件至少携带 userId 或 anonymousId 之一', active: true, severity: 'error' },
    { id: 'rule_10', name: 'timestamp 合理性', desc: '时间戳不早于昨天或不晚于未来 5 分钟', active: true, severity: 'warning' },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="总规则数" value={rules.length} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已启用" value={rules.filter(r => r.active).length} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Error 级" value={rules.filter(r => r.severity === 'error').length} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Warning 级" value={rules.filter(r => r.severity === 'warning').length} valueStyle={{ color: '#faad14' }} /></Card></Col>
      </Row>

      <Card size="small" title="验证规则配置">
        {rules.map(r => (
          <Card key={r.id} size="small" style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Space>
                  <Text strong style={{ fontSize: 13 }}>{r.name}</Text>
                  <Tag color={r.severity === 'error' ? 'red' : 'orange'}>{r.severity}</Tag>
                  <Badge status={r.active ? 'success' : 'default'} text={r.active ? '启用' : '禁用'} />
                </Space>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{r.desc}</div>
              </div>
              <Space>
                <Button size="small" type="link">编辑</Button>
                <Button size="small" type="link" danger={r.active} >{r.active ? '禁用' : '启用'}</Button>
              </Space>
            </div>
          </Card>
        ))}
      </Card>
    </div>
  );
}

export function VerifyPage() {
  const [tab, setTab] = useState('schema');
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        <Space><ThunderboltOutlined />埋点验证引擎</Space>
      </Title>
      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'schema',
          label: <Space><CodeOutlined />Schema 注册</Space>,
          children: <SchemaRegistryTab />,
        },
        {
          key: 'run',
          label: <Space><PlayCircleOutlined />执行验证</Space>,
          children: <RunVerificationTab />,
        },
        {
          key: 'history',
          label: <Space><HistoryOutlined />验证历史</Space>,
          children: <VerificationHistoryTab />,
        },
        {
          key: 'rules',
          label: <Space><SettingOutlined />规则配置</Space>,
          children: <RulesConfigTab />,
        },
      ]} />
    </div>
  );
}
