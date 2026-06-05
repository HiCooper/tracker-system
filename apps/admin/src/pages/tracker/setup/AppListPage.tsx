import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Popconfirm, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useSetupStore } from '../../../stores/setupStore';
import type { SpmApp } from '../../../types/spm';
import dayjs from 'dayjs';

const { Title } = Typography;

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

  const columns: ColumnsType<SpmApp> = [
    { title: '应用名称', dataIndex: 'appName', key: 'appName', width: 160 },
    { title: '应用标识', dataIndex: 'appCode', key: 'appCode', width: 140, render: (c: string) => <code>{c}</code> },
    { title: '页面数', dataIndex: 'pageCount', key: 'pageCount', width: 80, align: 'center' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作', key: 'actions', width: 140,
      render: (_, r) => (
        <Space>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>应用列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>新建应用</Button>
      </div>
      <Table columns={columns} dataSource={apps} rowKey="id" loading={loading} />

      <Modal title="新建应用" open={open} onOk={handleCreate} onCancel={() => { setOpen(false); form.resetFields(); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="appName" label="应用名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 主站应用" onChange={(e) => { const slug = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(); form.setFieldValue('appCode', slug ? `a_${slug}` : ''); }} />
          </Form.Item>
          <Form.Item name="appCode" label="应用标识" rules={[{ required: true }, { pattern: /^a_[a-zA-Z0-9_]+$/, message: '格式: a_xxx' }]}>
            <Input placeholder="a_main" />
          </Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
