import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Popconfirm, message, Card, Row, Col, Statistic, Tag } from 'antd';
import { PlusOutlined, AppstoreOutlined, FileTextOutlined, CodeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useSetupStore } from '../../../stores/setupStore';
import type { SpmApp } from '../../../types/spm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export function AppListPage() {
  const { apps, loading, fetchApps, createApp, deleteApp } = useSetupStore();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => { fetchApps(); }, []);

  const handleCreate = async () => {
    const v = await form.validateFields();
    await createApp(v);
    message.success('创建成功');
    setOpen(false);
    form.resetFields();
  };

  const stats = useMemo(() => ({
    total: apps.length,
    totalPages: apps.reduce((s, a) => s + (a.pageCount || 0), 0),
  }), [apps]);

  const columns: ColumnsType<SpmApp> = [
    { title: '应用名称', dataIndex: 'appName', key: 'appName', width: 180,
      render: (n: string, r) => <a onClick={() => navigate(`/tracker/setup/${r.id}`)} style={{ fontWeight: 500 }}>{n}</a> },
    { title: '应用标识', dataIndex: 'appCode', key: 'appCode', width: 180,
      render: (c: string) => (
        <code style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, fontSize: 13, color: '#1E40AF' }}>
          {c}
        </code>
      )},
    { title: '页面数', dataIndex: 'pageCount', key: 'pageCount', width: 80, align: 'center',
      render: (c: number) => <Tag style={{ borderRadius: 4 }} color={c > 0 ? 'blue' : 'default'}>{c || 0}</Tag> },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true,
      render: (d: string) => d || <Text type="secondary">—</Text> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 130,
      render: (t: string) => <Text style={{ fontSize: 12, color: '#64748B' }}>{dayjs(t).format('YYYY-MM-DD HH:mm')}</Text> },
    {
      title: '操作', key: 'actions', width: 140,
      render: (_, r) => (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => navigate(`/tracker/setup/${r.id}`)}>进入</Button>
          <Popconfirm title="确定删除?" onConfirm={async () => { await deleteApp(r.id); message.success('已删除'); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1E293B' }}>应用列表</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>管理埋点应用，点击「进入」查看页面、区块和功能层级</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建应用</Button>
      </div>

      {/* Stats */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { title: '应用总数', value: stats.total, color: '#1E40AF', icon: <AppstoreOutlined /> },
          { title: '页面总数', value: stats.totalPages, color: '#16A34A', icon: <FileTextOutlined /> },
        ].map((s, i) => (
          <Col span={6} key={i}>
            <Card size="small" style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <Statistic title={<Text style={{ fontSize: 12, color: '#64748B' }}>{s.title}</Text>}
                value={s.value} valueStyle={{ fontSize: 24, fontWeight: 700, color: s.color }} prefix={s.icon} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Table */}
      <Card size="small" style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Table columns={columns} dataSource={apps} rowKey="id" loading={loading}
          pagination={{ size: 'small', showSizeChanger: false, showTotal: (t) => `共 ${t} 个应用` }}
          size="middle"
          locale={{ emptyText: '暂无应用，点击「新建应用」开始创建' }} />
      </Card>

      {/* Create Modal */}
      <Modal title="新建应用" open={open} onOk={handleCreate} onCancel={() => { setOpen(false); form.resetFields(); }} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="appName" label="应用名称" rules={[{ required: true, message: '请输入应用名称' }]}>
            <Input placeholder="例如: 主站应用" onChange={(e) => {
              const slug = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
              form.setFieldValue('appCode', slug ? `a_${slug}` : '');
            }} />
          </Form.Item>
          <Form.Item name="appCode" label="应用标识" rules={[{ required: true, message: '请输入应用标识' }, { pattern: /^a_[a-zA-Z0-9_]+$/, message: '格式: a_xxx' }]}>
            <Input placeholder="a_main" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
