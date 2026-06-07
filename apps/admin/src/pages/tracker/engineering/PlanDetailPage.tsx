import { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Breadcrumb, Table, Button, Tag, Space, Timeline, Input, message, Descriptions } from 'antd';
import { HomeOutlined, CheckOutlined, CloseOutlined, RocketOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { usePlanStore } from '../../../stores/planStore';
import type { PlanEvent, PlanStatus } from '../../../types/trackingPlan';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_MAP: Record<PlanStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  reviewing: { color: 'processing', label: '审核中' },
  approved: { color: 'success', label: '已通过' },
  implementing: { color: 'warning', label: '实现中' },
  verified: { color: 'cyan', label: '已验证' },
  online: { color: 'green', label: '已上线' },
  rejected: { color: 'error', label: '已驳回' },
};

export function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentPlan, loading, fetchPlan, reviewPlan, goOnline } = usePlanStore();
  const [comment, setComment] = useState('');

  useEffect(() => { if (id) fetchPlan(Number(id)); }, [id]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (id) {
      await reviewPlan(Number(id), { action, comment: comment || undefined });
      message.success(action === 'approve' ? '已通过审核' : '已驳回');
      setComment('');
      fetchPlan(Number(id));
    }
  };

  const handleGoOnline = async () => {
    if (id) { await goOnline(Number(id)); message.success('已上线'); fetchPlan(Number(id)); }
  };

  if (!currentPlan) return <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>加载中...</div>;

  const s = STATUS_MAP[currentPlan.status];

  const eventColumns: ColumnsType<PlanEvent> = [
    { title: '事件标识', dataIndex: 'eventKey', key: 'eventKey', width: 180, render: (v: string) => <code>{v}</code> },
    { title: '事件名称', dataIndex: 'eventName', key: 'eventName', width: 140 },
    { title: '分类', dataIndex: 'category', key: 'category', width: 100, render: (v: string) => <Tag>{v}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'desc' },
    { title: '属性', dataIndex: 'properties', key: 'props', render: (props: PlanEvent['properties']) => props.length > 0 ? props.map((p) => <Tag key={p.propKey} color="blue">{p.propKey}</Tag>) : <span style={{ color: '#ccc' }}>—</span> },
  ];

  const timeline: { color: 'green' | 'red' | 'blue'; children: string }[] = [
    { color: 'green', children: `创建 (${dayjs(currentPlan.createdAt).format('MM-DD HH:mm')})` },
  ];
  if (currentPlan.status !== 'draft') timeline.push({ color: currentPlan.status === 'reviewing' ? 'blue' : 'green', children: '提交审核' });
  if (currentPlan.status === 'approved' || currentPlan.status === 'implementing' || currentPlan.status === 'verified' || currentPlan.status === 'online') {
    timeline.push({ color: 'green', children: `审核通过${currentPlan.reviewComment ? ` — ${currentPlan.reviewComment}` : ''}` });
  }
  if (currentPlan.status === 'rejected') timeline.push({ color: 'red', children: `驳回${currentPlan.reviewComment ? ` — ${currentPlan.reviewComment}` : ''}` });
  if (currentPlan.status === 'online') timeline.push({ color: 'green', children: '已上线' });

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/engineering/plans"><HomeOutlined /> 需求方案</Link> },
        { title: currentPlan.planName },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{currentPlan.planName}</Title>
        <Tag color={s.color} style={{ fontSize: 14, padding: '2px 12px' }}>{s.label}</Tag>
      </div>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="应用">{currentPlan.appName}</Descriptions.Item>
              <Descriptions.Item label="版本">{currentPlan.appVersion}</Descriptions.Item>
              <Descriptions.Item label="提交人">{currentPlan.submitter}</Descriptions.Item>
              <Descriptions.Item label="审核人">{currentPlan.reviewer || '—'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{dayjs(currentPlan.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{dayjs(currentPlan.updatedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            </Descriptions>
          </Card>
          <Card title={`事件定义 (${currentPlan.events.length})`} size="small" style={{ marginBottom: 16 }}>
            <Table bordered columns={eventColumns} dataSource={currentPlan.events} rowKey="eventKey" pagination={false} size="small" />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="状态流转" size="small" style={{ marginBottom: 16 }}>
            <Timeline items={timeline} style={{ marginTop: 8 }} />
          </Card>

          {currentPlan.status === 'reviewing' && (
            <Card title="审核操作" size="small" style={{ marginBottom: 16 }}>
              <TextArea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="审核意见（可选）" style={{ marginBottom: 12 }} />
              <Space>
                <Button type="primary" icon={<CheckOutlined />} onClick={() => handleReview('approve')}>通过</Button>
                <Button danger icon={<CloseOutlined />} onClick={() => handleReview('reject')}>驳回</Button>
              </Space>
            </Card>
          )}

          {currentPlan.reviewComment && currentPlan.status !== 'reviewing' && (
            <Card title="审核意见" size="small" style={{ marginBottom: 16 }}>
              <Text type="secondary">{currentPlan.reviewComment}</Text>
            </Card>
          )}

          {(currentPlan.status === 'approved' || currentPlan.status === 'verified') && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<RocketOutlined />} block onClick={handleGoOnline}>上线</Button>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
