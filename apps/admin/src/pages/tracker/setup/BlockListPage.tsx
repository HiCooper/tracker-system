import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Breadcrumb, Popconfirm, message, Card, Row, Col, Statistic, Tag } from 'antd';
import { PlusOutlined, HomeOutlined, BlockOutlined, FunctionOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useSetupStore } from '../../../stores/setupStore';
import type { SpmBlock } from '../../../types/spm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export function BlockListPage() {
  const { appId, pageId } = useParams<{ appId: string; pageId: string }>();
  const { blocks, loading, currentApp, currentPage, fetchApp, fetchPages, fetchBlocks, createBlock, deleteBlock } = useSetupStore();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const aid = Number(appId), pid = Number(pageId);

  useEffect(() => {
    if (aid) {
      fetchApp(aid);
      fetchPages(aid).then(() => {
        const p = useSetupStore.getState().pages.find(x => x.id === pid);
        if (p) useSetupStore.setState({ currentPage: p });
      });
    }
    if (pid) fetchBlocks(pid);
  }, [aid, pid]);

  const handleCreate = async () => {
    const v = await form.validateFields();
    await createBlock(pid, v);
    message.success('添加成功');
    setOpen(false);
    form.resetFields();
  };

  const columns: ColumnsType<SpmBlock> = [
    { title: '区块名称', dataIndex: 'blockName', key: 'blockName', width: 180,
      render: (n: string, r) => <a onClick={() => navigate(`/tracker/setup/${aid}/${pid}/${r.id}`)} style={{ fontWeight: 500 }}>{n}</a> },
    { title: '区块标识', dataIndex: 'blockCode', key: 'blockCode', width: 300,
      render: (c: string) => <code style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#1E40AF' }}>{c}</code> },
    { title: '功能数', dataIndex: 'functionCount', key: 'functionCount', width: 80, align: 'center',
      render: (c: number) => <Tag style={{ borderRadius: 4 }} color={c > 0 ? 'blue' : 'default'}>{c || 0}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 130,
      render: (t: string) => <Text style={{ fontSize: 12, color: '#64748B' }}>{dayjs(t).format('YYYY-MM-DD HH:mm')}</Text> },
    {
      title: '操作', key: 'actions', width: 140,
      render: (_, r) => (
        <Space size={2}>
          <Button type="link" size="small" onClick={() => navigate(`/tracker/setup/${aid}/${pid}/${r.id}`)}>进入</Button>
          <Popconfirm title="确定删除?" onConfirm={async () => { await deleteBlock(r.id); message.success('已删除'); }}>
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
        { title: <Link to={`/tracker/setup/${aid}`}>{currentApp?.appName || '...'}</Link> },
        { title: currentPage?.pageName || '...' },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1E293B' }}>{currentPage?.pageName || '...'} — 区块列表</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            页面标识: <code style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 3 }}>{currentPage?.pageCode || '...'}</code>
          </Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>添加区块</Button>
      </div>

      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic title={<Text style={{ fontSize: 12, color: '#64748B' }}>区块总数</Text>}
              value={blocks.length} valueStyle={{ fontSize: 24, fontWeight: 700, color: '#1E40AF' }} prefix={<BlockOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Statistic title={<Text style={{ fontSize: 12, color: '#64748B' }}>功能总数</Text>}
              value={blocks.reduce((s, b) => s + (b.functionCount || 0), 0)} valueStyle={{ fontSize: 24, fontWeight: 700, color: '#16A34A' }} prefix={<FunctionOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card size="small" style={{ borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Table columns={columns} dataSource={blocks} rowKey="id" loading={loading}
          pagination={{ size: 'small', showSizeChanger: false, showTotal: (t) => `共 ${t} 个区块` }}
          size="middle" locale={{ emptyText: '暂无区块，点击「添加区块」开始创建' }} />
      </Card>

      <Modal title="添加区块" open={open} onOk={handleCreate} onCancel={() => { setOpen(false); form.resetFields(); }} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="blockName" label="区块名称" rules={[{ required: true, message: '请输入区块名称' }]}>
            <Input placeholder="例如: Banner区" onChange={(e) => {
              const pageCode = currentPage?.pageCode || '';
              const slug = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
              form.setFieldValue('blockCode', slug ? `${pageCode}.c_${slug}` : '');
            }} />
          </Form.Item>
          <Form.Item name="blockCode" label="区块标识" rules={[{ required: true, message: '请输入区块标识' }, { pattern: /^a_[^.]+\.b_[^.]+\.c_[a-zA-Z0-9_]+$/, message: '格式: a_xxx.b_xxx.c_xxx' }]}>
            <Input placeholder="a_main.b_home.c_banner" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
