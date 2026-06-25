import { useEffect, useMemo } from 'react';
import { Table, Button, Typography, Tag, Space, Popconfirm, message, Tabs, Card, Row, Col, Statistic, Input, Badge } from 'antd';
import { PlusOutlined, FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, RocketOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { usePlanStore } from '../../../stores/planStore';
import type { TrackingPlan, PlanStatus } from '../../../types/trackingPlan';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_MAP: Record<PlanStatus, { color: string; label: string; icon: React.ReactNode }> = {
  draft:       { color: 'default',    label: '草稿',   icon: <FileTextOutlined /> },
  reviewing:   { color: 'processing', label: '审核中', icon: <ClockCircleOutlined /> },
  approved:    { color: 'success',    label: '已通过', icon: <CheckCircleOutlined /> },
  implementing:{ color: 'warning',    label: '实现中', icon: <ClockCircleOutlined /> },
  verified:    { color: 'cyan',       label: '已验证', icon: <CheckCircleOutlined /> },
  online:      { color: 'green',      label: '已上线', icon: <RocketOutlined /> },
  rejected:    { color: 'error',      label: '已驳回', icon: <ExclamationCircleOutlined /> },
};

export function PlanListPage() {
  const { plans, loading, statusFilter, setStatusFilter, fetchPlans, deletePlan, submitForReview, goOnline } = usePlanStore();
  const navigate = useNavigate();

  useEffect(() => { fetchPlans(statusFilter ? { status: statusFilter } : {}); }, [statusFilter]);

  const handleSubmitReview = async (id: number) => {
    await submitForReview(id);
    message.success('已提交审核');
    fetchPlans(statusFilter ? { status: statusFilter } : {});
  };

  const handleGoOnline = async (id: number) => {
    await goOnline(id);
    message.success('已上线');
    fetchPlans(statusFilter ? { status: statusFilter } : {});
  };

  const stats = useMemo(() => {
    const byStatus = (s: string) => plans.filter(p => p.status === s).length;
    return {
      total: plans.length,
      draft: byStatus('draft'),
      reviewing: byStatus('reviewing'),
      online: byStatus('online'),
    };
  }, [plans]);

  const columns: ColumnsType<TrackingPlan> = [
    { title: '方案名称', dataIndex: 'planName', key: 'planName', width: 200,
      render: (n: string, r) => <a onClick={() => navigate(`/tracker/engineering/plans/${r.id}`)} style={{ fontWeight: 500 }}>{n}</a> },
    { title: '应用', dataIndex: 'appName', key: 'appName', width: 120,
      render: (n: string) => <Tag style={{ borderRadius: 4 }}>{n || '—'}</Tag> },
    { title: '版本', dataIndex: 'appVersion', key: 'appVersion', width: 90,
      render: (v: string) => <code style={{ fontSize: 12, background: '#F1F5F9', padding: '2px 6px', borderRadius: 3 }}>{v}</code> },
    { title: '事件', dataIndex: 'events', key: 'events', width: 60, align: 'center',
      render: (events: any[]) => <Badge count={events?.length || 0} showZero style={{ backgroundColor: events?.length ? '#3B82F6' : '#CBD5E1' }} /> },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 95,
      render: (s: PlanStatus) => {
        const m = STATUS_MAP[s];
        return <Tag icon={m.icon} color={m.color} style={{ borderRadius: 4 }}>{m.label}</Tag>;
      },
    },
    { title: '提交人', dataIndex: 'submitter', key: 'submitter', width: 90,
      render: (s: string) => s || <Text type="secondary">—</Text> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 110,
      render: (t: string) => <Text style={{ fontSize: 12, color: '#64748B' }}>{dayjs(t).format('MM-DD HH:mm')}</Text> },
    {
      title: '操作', key: 'actions', width: 240,
      render: (_, r) => (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => navigate(`/tracker/engineering/plans/${r.id}`)}>详情</Button>
          {r.status === 'draft' && (<>
            <Button type="link" size="small" onClick={() => navigate(`/tracker/engineering/plans/${r.id}/edit`)}>编辑</Button>
            <Button type="link" size="small" style={{ color: '#D97706' }} onClick={() => handleSubmitReview(r.id)}>提审</Button>
            <Popconfirm title="确定删除?" onConfirm={async () => { await deletePlan(r.id); message.success('已删除'); fetchPlans(statusFilter ? { status: statusFilter } : {}); }}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </>)}
          {r.status === 'rejected' && (<>
            <Button type="link" size="small" onClick={() => navigate(`/tracker/engineering/plans/${r.id}/edit`)}>修改</Button>
            <Button type="link" size="small" style={{ color: '#D97706' }} onClick={() => handleSubmitReview(r.id)}>重新提审</Button>
          </>)}
          {(r.status === 'approved' || r.status === 'verified') && (
            <Button type="link" size="small" style={{ color: '#16A34A' }} onClick={() => handleGoOnline(r.id)}>上线</Button>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    { key: '', label: '全部' },
    { key: 'draft', label: '草稿' },
    { key: 'reviewing', label: '审核中' },
    { key: 'online', label: '已上线' },
    { key: 'rejected', label: '已驳回' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1E293B' }}>埋点需求方案</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>管理埋点需求从提出到上线的完整生命周期</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tracker/engineering/plans/new')}>新建方案</Button>
      </div>

      {/* Stats */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { title: '方案总数', value: stats.total, color: '#1E40AF', icon: <FileTextOutlined /> },
          { title: '草稿', value: stats.draft, color: '#64748B', icon: <FileTextOutlined /> },
          { title: '审核中', value: stats.reviewing, color: '#D97706', icon: <ClockCircleOutlined /> },
          { title: '已上线', value: stats.online, color: '#16A34A', icon: <RocketOutlined /> },
        ].map((s, i) => (
          <Col span={6} key={i}>
            <Card size="small" style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <Statistic title={<Text style={{ fontSize: 12, color: '#64748B' }}>{s.title}</Text>}
                value={s.value} valueStyle={{ fontSize: 24, fontWeight: 700, color: s.color }} prefix={s.icon} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Tabs + Table */}
      <Card size="small" style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        title={<Tabs activeKey={statusFilter} onChange={setStatusFilter} items={tabItems} style={{ marginBottom: -16 }} />}
        bodyStyle={{ paddingTop: 0 }}>
        <Table scroll={{ x: 'max-content' }} columns={columns} dataSource={plans} rowKey="id" loading={loading}
          pagination={{ size: 'small', showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
          size="middle" style={{ marginTop: -8 }}
          locale={{ emptyText: '暂无方案，点击上方「新建方案」开始创建' }} />
      </Card>
    </div>
  );
}
