import { useEffect } from 'react';
import { Table, Button, Typography, Tag, Space, Popconfirm, message, Tabs } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { usePlanStore } from '../../../stores/planStore';
import type { TrackingPlan, PlanStatus } from '../../../types/trackingPlan';
import dayjs from 'dayjs';

const { Title } = Typography;

const STATUS_MAP: Record<PlanStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  reviewing: { color: 'processing', label: '审核中' },
  approved: { color: 'success', label: '已通过' },
  implementing: { color: 'warning', label: '实现中' },
  verified: { color: 'cyan', label: '已验证' },
  online: { color: 'green', label: '已上线' },
  rejected: { color: 'error', label: '已驳回' },
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

  const columns: ColumnsType<TrackingPlan> = [
    { title: '方案名称', dataIndex: 'planName', key: 'planName', width: 200 },
    { title: '应用', dataIndex: 'appName', key: 'appName', width: 120 },
    { title: '版本', dataIndex: 'appVersion', key: 'appVersion', width: 100 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: PlanStatus) => {
        const m = STATUS_MAP[s];
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    { title: '提交人', dataIndex: 'submitter', key: 'submitter', width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 120, render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作', key: 'actions', width: 280,
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => navigate(`/tracker/engineering/plans/${r.id}`)}>详情</Button>
          {r.status === 'draft' && (
            <>
              <Button type="link" size="small" onClick={() => navigate(`/tracker/engineering/plans/${r.id}/edit`)}>编辑</Button>
              <Button type="link" size="small" onClick={() => handleSubmitReview(r.id)}>提审</Button>
              <Popconfirm title="确定删除?" onConfirm={async () => { await deletePlan(r.id); message.success('已删除'); fetchPlans(); }}>
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </>
          )}
          {r.status === 'rejected' && (
            <>
              <Button type="link" size="small" onClick={() => navigate(`/tracker/engineering/plans/${r.id}/edit`)}>修改</Button>
              <Button type="link" size="small" onClick={() => handleSubmitReview(r.id)}>重新提审</Button>
            </>
          )}
          {(r.status === 'approved' || r.status === 'verified') && (
            <Button type="link" size="small" onClick={() => handleGoOnline(r.id)}>上线</Button>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>埋点需求方案</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tracker/engineering/plans/new')}>新建方案</Button>
      </div>
      <Tabs activeKey={statusFilter} onChange={setStatusFilter} items={tabItems} style={{ marginBottom: 16 }} />
      <Table columns={columns} dataSource={plans} rowKey="id" loading={loading} pagination={false} />
    </div>
  );
}
