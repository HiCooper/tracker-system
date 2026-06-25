import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Breadcrumb, Popconfirm, message, Card, Row, Col, Statistic, Tag } from 'antd';
import { PlusOutlined, HomeOutlined, FileTextOutlined, BlockOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useSetupStore } from '../../../stores/setupStore';
import type { SpmPage } from '../../../types/spm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export function PageListPage() {
  const { appId } = useParams<{ appId: string }>();
  const { pages, loading, currentApp, fetchApp, fetchPages, createPage, deletePage } = useSetupStore();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const id = Number(appId);

  useEffect(() => { if (id) { fetchApp(id); fetchPages(id); } }, [id]);

  const handleCreate = async () => {
    const v = await form.validateFields();
    await createPage(id, v);
    message.success('添加成功');
    setOpen(false);
    form.resetFields();
  };

  const columns: ColumnsType<SpmPage> = [
    { title: '页面名称', dataIndex: 'pageName', key: 'pageName', width: 180,
      render: (n: string, r) => <a onClick={() => navigate(`/tracker/setup/${id}/${r.id}`)} style={{ fontWeight: 500 }}>{n}</a> },
    { title: '页面标识', dataIndex: 'pageCode', key: 'pageCode', width: 280,
      render: (c: string) => <code style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#1E40AF' }}>{c}</code> },
    { title: '区块数', dataIndex: 'blockCount', key: 'blockCount', width: 80, align: 'center',
      render: (c: number) => <Tag style={{ borderRadius: 4 }} color={c > 0 ? 'blue' : 'default'}>{c || 0}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 130,
      render: (t: string) => <Text style={{ fontSize: 12, color: '#64748B' }}>{dayjs(t).format('YYYY-MM-DD HH:mm')}</Text> },
    {
      title: '操作', key: 'actions', width: 140,
      render: (_, r) => (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => navigate(`/tracker/setup/${id}/${r.id}`)}>进入</Button>
          <Popconfirm title="确定删除?" onConfirm={async () => { await deletePage(r.id); message.success('已删除'); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 12 }} items={[
        { title: <Link to="/tracker/setup"><HomeOutlined /> 应用列表</Link> },
        { title: currentApp?.appName || '...' },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1E293B' }}>{currentApp?.appName || '...'} — 页面列表</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            应用标识: <code style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 3 }}>{currentApp?.appCode || '...'}</code>
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>添加页面</Button>
      </div>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic title={<Text style={{ fontSize: 12, color: '#64748B' }}>页面总数</Text>}
              value={pages.length} valueStyle={{ fontSize: 24, fontWeight: 700, color: '#1E40AF' }} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic title={<Text style={{ fontSize: 12, color: '#64748B' }}>区块总数</Text>}
              value={pages.reduce((s, p) => s + (p.blockCount || 0), 0)} valueStyle={{ fontSize: 24, fontWeight: 700, color: '#16A34A' }} prefix={<BlockOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Table scroll={{ x: 'max-content' }} columns={columns} dataSource={pages} rowKey="id" loading={loading}
          pagination={{ size: 'small', showSizeChanger: false, showTotal: (t) => `共 ${t} 个页面` }}
          size="middle" locale={{ emptyText: '暂无页面，点击「添加页面」开始创建' }} />
      </Card>

      <Modal title="添加页面" open={open} onOk={handleCreate} onCancel={() => { setOpen(false); form.resetFields(); }} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="pageName" label="页面名称" rules={[{ required: true, message: '请输入页面名称' }]}>
            <Input placeholder="例如: 首页" onChange={(e) => {
              const appCode = currentApp?.appCode || '';
              const slug = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
              form.setFieldValue('pageCode', slug ? `${appCode}.b_${slug}` : '');
            }} />
          </Form.Item>
          <Form.Item name="pageCode" label="页面标识" rules={[{ required: true, message: '请输入页面标识' }, { pattern: /^a_[^.]+\.b_[a-zA-Z0-9_]+$/, message: '格式: a_xxx.b_xxx' }]}>
            <Input placeholder="a_main.b_home" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
