import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Breadcrumb, Popconfirm, message } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useSetupStore } from '../../../stores/setupStore';
import type { SpmPage } from '../../../types/spm';
import dayjs from 'dayjs';

const { Title } = Typography;

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
    { title: '页面名称', dataIndex: 'pageName', key: 'pageName', width: 160 },
    { title: '页面标识', dataIndex: 'pageCode', key: 'pageCode', width: 240, render: (c: string) => <code>{c}</code> },
    { title: '区块数', dataIndex: 'blockCount', key: 'blockCount', width: 80, align: 'center' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作', key: 'actions', width: 140,
      render: (_, r) => (
        <Space>
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
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/setup"><HomeOutlined /> 应用列表</Link> },
        { title: currentApp?.appName || '...' },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{currentApp?.appName || '...'} — 页面列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>添加页面</Button>
      </div>
      <Table columns={columns} dataSource={pages} rowKey="id" loading={loading} />

      <Modal title="添加页面" open={open} onOk={handleCreate} onCancel={() => { setOpen(false); form.resetFields(); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="pageName" label="页面名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 首页" onChange={(e) => {
              const appCode = currentApp?.appCode || '';
              const slug = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
              form.setFieldValue('pageCode', slug ? `${appCode}.b_${slug}` : '');
            }} />
          </Form.Item>
          <Form.Item name="pageCode" label="页面标识" rules={[{ required: true }, { pattern: /^a_[^.]+\.b_[a-zA-Z0-9_]+$/, message: '格式: a_xxx.b_xxx' }]}>
            <Input placeholder="a_main.b_home" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
