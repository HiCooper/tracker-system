import { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Breadcrumb, Table, Button, Tag, Space, Timeline, Input, message, Descriptions, Badge } from 'antd';
import { HomeOutlined, CheckOutlined, CloseOutlined, RocketOutlined, ClockCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { usePlanStore } from '../../../stores/planStore';
import type { PlanEvent, PlanStatus } from '../../../types/trackingPlan';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_MAP: Record<PlanStatus, { color: string; label: string; icon: React.ReactNode }> = {
  draft:       { color: 'default',    label: '草稿',   icon: <FileTextOutlined /> },
  reviewing:   { color: 'processing', label: '审核中', icon: <ClockCircleOutlined /> },
  approved:    { color: 'success',    label: '已通过', icon: <CheckOutlined /> },
  implementing:{ color: 'warning',    label: '实现中', icon: <ClockCircleOutlined /> },
  verified:    { color: 'cyan',       label: '已验证', icon: <CheckOutlined /> },
  online:      { color: 'green',      label: '已上线', icon: <RocketOutlined /> },
  rejected:    { color: 'error',      label: '已驳回', icon: <CloseOutlined /> },
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

  if (!currentPlan) return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <ClockCircleOutlined style={{ fontSize: 32, color: '#CBD5E1', marginBottom: 12 }} />
      <div style={{ color: '#94A3B8' }}>加载中...</div>
    </div>
  );

  const s = STATUS_MAP[currentPlan.status];

  const eventColumns: ColumnsType<PlanEvent> = [
    { title: '事件标识', dataIndex: 'eventKey', key: 'eventKey', width: 180,
      render: (v: string) => <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>{v}</code> },
    { title: '事件名称', dataIndex: 'eventName', key: 'eventName', width: 150,
      render: (n: string) => <Text strong>{n}</Text> },
    { title: '分类', dataIndex: 'category', key: 'category', width: 85,
      render: (v: string) => <Tag style={{ borderRadius: 4 }}>{v}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'desc', ellipsis: true,
      render: (d: string) => d || <Text type="secondary">—</Text> },
    { title: '属性', dataIndex: 'properties', key: 'props', width: 200,
      render: (props: PlanEvent['properties']) => props?.length > 0
        ? <Space size={2} wrap>{props.map((p) => <Tag key={p.propKey} color="blue" style={{ borderRadius: 4, fontSize: 11 }}>{p.propKey}<Text type="secondary" style={{ fontSize: 10, marginLeft: 3 }}>{p.dataType}</Text></Tag>)}</Space>
        : <Text type="secondary" style={{ fontSize: 12 }}>—</Text> },
  ];

  const timeline: { color: 'green' | 'red' | 'blue' | 'gray'; children: React.ReactNode }[] = [
    { color: 'green', children: <><Text strong>创建</Text> <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(currentPlan.createdAt).format('MM-DD HH:mm')}</Text></> },
  ];
  if (currentPlan.status !== 'draft') timeline.push({ color: 'blue', children: <Text strong>提交审核</Text> });
  if (currentPlan.status === 'rejected') {
    timeline.push({ color: 'red', children: <div><Text strong>已驳回</Text>{currentPlan.reviewComment && <div style={{ fontSize: 12, color: '#64748B' }}>{currentPlan.reviewComment}</div>}</div> });
  }
  if (['approved','implementing','verified','online'].includes(currentPlan.status)) {
    timeline.push({ color: 'green', children: <div><Text strong>审核通过</Text>{currentPlan.reviewComment && <div style={{ fontSize: 12, color: '#64748B' }}>{currentPlan.reviewComment}</div>}</div> });
  }
  if (currentPlan.status === 'online') timeline.push({ color: 'green', children: <Text strong>已上线</Text> });

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 12 }} items={[
        { title: <Link to="/tracker/engineering/plans"><HomeOutlined /> 需求方案</Link> },
        { title: currentPlan.planName },
      ]} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1E293B' }}>{currentPlan.planName}</Title>
          <Tag icon={s.icon} color={s.color} style={{ fontSize: 14, padding: '2px 12px', borderRadius: 6 }}>{s.label}</Tag>
        </div>
        {(currentPlan.status === 'approved' || currentPlan.status === 'verified') && (
          <Button type="primary" icon={<RocketOutlined />} onClick={handleGoOnline} style={{ background: '#16A34A', borderColor: '#16A34A' }}>上线</Button>
        )}
      </div>

      <Row gutter={16}>
        <Col span={16}>
          {/* Basic Info */}
          <Card size="small" title={<span style={{ fontWeight: 600, fontSize: 14 }}>基本信息</span>}
            style={{ marginBottom: 12, borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Descriptions column={3} size="small" colon={false}>
              <Descriptions.Item label={<Text type="secondary">应用</Text>}>
                <Tag style={{ borderRadius: 4 }}>{currentPlan.appName || currentPlan.appId}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">版本</Text>}>
                <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 3 }}>{currentPlan.appVersion}</code>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">事件数</Text>}>
                <Badge count={currentPlan.events?.length || 0} style={{ backgroundColor: '#3B82F6' }} />
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">提交人</Text>}>{currentPlan.submitter || '—'}</Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">审核人</Text>}>{currentPlan.reviewer || '—'}</Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">更新</Text>}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>{dayjs(currentPlan.updatedAt).format('MM-DD HH:mm')}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Events */}
          <Card size="small" title={<span style={{ fontWeight: 600, fontSize: 14 }}>事件定义 ({currentPlan.events?.length || 0})</span>}
            style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Table bordered columns={eventColumns} dataSource={currentPlan.events} rowKey="eventKey"
              pagination={false} size="small"
              locale={{ emptyText: '该方案暂无事件定义' }} />
          </Card>
        </Col>

        <Col span={8}>
          {/* Timeline */}
          <Card size="small" title={<span style={{ fontWeight: 600, fontSize: 14 }}>状态流转</span>}
            style={{ marginBottom: 12, borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Timeline items={timeline} style={{ marginTop: 4 }} />
          </Card>

          {/* Review Actions */}
          {currentPlan.status === 'reviewing' && (
            <Card size="small" title={<span style={{ fontWeight: 600, fontSize: 14 }}>审核操作</span>}
              style={{ marginBottom: 12, borderRadius: 8, border: '1px solid #FED7AA', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <TextArea rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="审核意见（可选）" style={{ marginBottom: 12 }} />
              <Space>
                <Button type="primary" icon={<CheckOutlined />} onClick={() => handleReview('approve')}>通过</Button>
                <Button danger icon={<CloseOutlined />} onClick={() => handleReview('reject')}>驳回</Button>
              </Space>
            </Card>
          )}

          {/* Review Comment (read-only) */}
          {currentPlan.reviewComment && currentPlan.status !== 'reviewing' && (
            <Card size="small" title={<span style={{ fontWeight: 600, fontSize: 14 }}>审核意见</span>}
              style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <Text type="secondary">{currentPlan.reviewComment}</Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
