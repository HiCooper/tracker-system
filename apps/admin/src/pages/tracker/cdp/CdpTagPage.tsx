import { useState, useEffect, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Typography, Tabs, Table, Tag, Space, Button,
  Input, Select, Badge, message,
} from 'antd';
import {
  TagOutlined, TeamOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, ThunderboltOutlined, SettingOutlined,
  ApiOutlined, SearchOutlined, CaretRightOutlined, UserAddOutlined,
} from '@ant-design/icons';
import { useSegmentStore } from '../../../stores/segmentStore';
import type { TagDef, CrowdDef } from '../../../services/segmentApi';

const { Title, Text } = Typography;

function TagManagementTab() {
  const { tags, loading, fetchTags, deleteTag } = useSegmentStore();
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => tags.filter((t: TagDef) => !search || t.name.includes(search) || t.rule.includes(search)),
    [tags, search],
  );

  useEffect(() => { fetchTags(); }, []);

  const cols = [
    { title: '状态', dataIndex: 'status', width: 50, render: (s: string) => <Badge status={s === 'active' ? 'success' : 'warning'} /> },
    { title: '标签名称', dataIndex: 'name', width: 130, render: (v: string, r: any) => <Tag color={r.type === 'computed' ? 'purple' : 'blue'}>{v}</Tag> },
    { title: '类型', dataIndex: 'type', width: 60, render: (v: string) => <Text style={{ fontSize: 11 }}>{v === 'rule' ? '规则' : '计算'}</Text> },
    { title: '分类', dataIndex: 'category', width: 70, render: (v: string) => <Tag>{v}</Tag> },
    { title: '覆盖用户', dataIndex: 'userCount', width: 80, sorter: (a: any, b: any) => a.userCount - b.userCount, render: (v: number) => v?.toLocaleString() },
    { title: '占比', dataIndex: 'coveragePct', width: 60, render: (v: number) => `${v}%` },
    { title: '趋势', dataIndex: 'trend', width: 50, render: (v: string) => <Text style={{ color: v === 'up' ? '#52c41a' : v === 'down' ? '#ff4d4f' : '#999' }}>{v === 'up' ? '↑' : v === 'down' ? '↓' : '→'}</Text> },
    { title: '规则', dataIndex: 'rule', ellipsis: true, render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
    { title: '更新', dataIndex: 'updatedAt', width: 110, render: (v: string) => <Text style={{ fontSize: 11, color: '#999' }}>{v}</Text> },
    { title: '操作', width: 80, render: (_: any, r: any) => <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => { deleteTag(r.id); message.success('已删除'); }}>删除</Button> },
  ];

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input placeholder="搜索标签" prefix={<SearchOutlined />} style={{ width: 180 }} size="small"
            value={search} onChange={e => setSearch(e.target.value)} allowClear />
          <Button type="primary" size="small" icon={<PlusOutlined />}>新建标签</Button>
          <Button size="small" icon={<ApiOutlined />}>标签血缘</Button>
        </Space>
      </Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="标签总数" value={tags.length} prefix={<TagOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="用户覆盖率" value="89.2%" valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="规则标签" value={tags.filter((t: TagDef) => t.type === 'rule').length} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="计算标签" value={tags.filter((t: TagDef) => t.type === 'computed').length} prefix={<ThunderboltOutlined />} /></Card></Col>
      </Row>
      <Card size="small" title="标签列表">
        <Table scroll={{ x: 'max-content' }} rowKey="id" columns={cols} dataSource={filtered} loading={loading} size="small" pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
}

function CrowdManagementTab() {
  const { crowds, fetchCrowds, deleteCrowd } = useSegmentStore();

  useEffect(() => { fetchCrowds(); }, []);

  const maxCrowd = crowds.reduce((m: number, c: CrowdDef) => Math.max(m, c.userCount), 0);
  const computing = crowds.filter((c: CrowdDef) => c.status === 'computing').length;

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space><Button type="primary" size="small" icon={<PlusOutlined />}>新建人群包</Button>
          <Button size="small" icon={<UserAddOutlined />}>ID 上传</Button>
          <Button size="small" icon={<ApiOutlined />}>API 导出</Button></Space>
      </Card>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="人群包" value={crowds.length} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="最大人群" value={maxCrowd} suffix="人" /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="计算中" value={computing} prefix={<CaretRightOutlined style={{ color: '#faad14' }} />} /></Card></Col>
        <Col span={6}><Button type="primary" size="small" icon={<PlusOutlined />}>新建人群</Button></Col>
      </Row>
      <Card size="small" title="人群列表">
        {crowds.map((c: CrowdDef) => (
          <Card key={c.id} size="small" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Space>
                  <Text strong>{c.name}</Text>
                  <Badge status={c.status === 'ready' ? 'success' : 'processing'} text={c.status === 'ready' ? '就绪' : '计算中'} />
                  <Tag color="blue">{c.userCount.toLocaleString()} 人</Tag>
                </Space>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{c.desc}</div>
                <div style={{ marginTop: 6 }}>
                  {c.baseTags.map((name: string) => <Tag key={name} color="purple" style={{ fontSize: 11 }}>{name}</Tag>)}
                  <Tag color="default" style={{ fontSize: 10 }}>{c.logic}</Tag>
                </div>
              </div>
              <Space>
                <Text style={{ fontSize: 11, color: '#bbb' }}>{c.updatedAt}</Text>
                <Button size="small" type="link">编辑</Button>
                <Button size="small" type="link" danger onClick={() => { deleteCrowd(c.id); message.success('已删除'); }}>删除</Button>
              </Space>
            </div>
          </Card>
        ))}
      </Card>
    </div>
  );
}

function TagFactoryTab() {
  return (
    <div>
      <Card size="small" title="新建规则标签">
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text style={{ fontSize: 12, color: '#999' }}>标签名称</Text>
            <Input placeholder="如：高活跃用户" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text style={{ fontSize: 12, color: '#999' }}>触发事件</Text>
            <Select style={{ width: 300, marginTop: 4 }} placeholder="选择事件"
              options={[{ label: '页面浏览 (page_view)', value: 'page_view' }, { label: '点击 (click)', value: 'click' }, { label: '支付成功 (purchase)', value: 'purchase' }, { label: '分享 (share)', value: 'share' }]} />
          </div>
          <div>
            <Text style={{ fontSize: 12, color: '#999' }}>条件</Text>
            <div style={{ background: '#fafafa', padding: 12, borderRadius: 4, marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Select size="small" style={{ width: 100 }} defaultValue="count" options={[{ label: '次数', value: 'count' }, { label: '属性', value: 'prop' }]} />
              <Select size="small" style={{ width: 70 }} defaultValue="gte" options={[{ label: '≥', value: 'gte' }, { label: '≤', value: 'lte' }]} />
              <Input size="small" style={{ width: 80 }} placeholder="值" />
              <Select size="small" style={{ width: 110 }} defaultValue="30d" options={[{ label: '近7天', value: '7d' }, { label: '近30天', value: '30d' }, { label: '近90天', value: '90d' }]} />
            </div>
          </div>
          <Button type="primary" icon={<PlusOutlined />}>创建标签</Button>
        </Space>
      </Card>

      <Card size="small" title="新建计算标签" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text style={{ fontSize: 12, color: '#999' }}>标签名称</Text>
            <Input placeholder="如：LTV 高潜用户" style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text style={{ fontSize: 12, color: '#999' }}>SQL 查询</Text>
            <Input.TextArea rows={5} style={{ marginTop: 4, fontFamily: 'monospace', fontSize: 12 }}
              placeholder={`SELECT user_id,
  CASE WHEN avg_pv > 20 AND total_pay > 500 THEN 'high'
       WHEN avg_pv > 10 THEN 'medium' ELSE 'low' END AS ltv_level
FROM user_behavior_agg WHERE dt >= '2026-05-01'`} />
          </div>
          <div>
            <Text style={{ fontSize: 12, color: '#999' }}>调度</Text>
            <Select defaultValue="daily" style={{ width: 150, marginTop: 4 }}
              options={[{ label: '每小时', value: 'hourly' }, { label: '每日', value: 'daily' }, { label: '每周', value: 'weekly' }]} />
          </div>
          <Button type="primary" icon={<CaretRightOutlined />}>提交任务</Button>
        </Space>
      </Card>
    </div>
  );
}

export function CdpTagPage() {
  const [tab, setTab] = useState('tags');
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}><Space><TeamOutlined />用户标签 & 人群</Space></Title>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'tags', label: <Space><TagOutlined />标签管理</Space>, children: <TagManagementTab /> },
        { key: 'crowds', label: <Space><TeamOutlined />人群管理</Space>, children: <CrowdManagementTab /> },
        { key: 'factory', label: <Space><SettingOutlined />标签工厂</Space>, children: <TagFactoryTab /> },
      ]} />
    </div>
  );
}
