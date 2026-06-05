import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Breadcrumb, Popconfirm, message } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useSetupStore } from '../../../stores/setupStore';
import type { SpmBlock } from '../../../types/spm';
import dayjs from 'dayjs';

const { Title } = Typography;

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
    { title: '区块名称', dataIndex: 'blockName', key: 'blockName', width: 160 },
    { title: '区块标识', dataIndex: 'blockCode', key: 'blockCode', width: 280, render: (c: string) => <code>{c}</code> },
    { title: '功能数', dataIndex: 'functionCount', key: 'functionCount', width: 80, align: 'center' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作', key: 'actions', width: 140,
      render: (_, r) => (
        <Space>
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
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/setup"><HomeOutlined /> 应用列表</Link> },
        { title: <Link to={`/tracker/setup/${aid}`}>{currentApp?.appName || '...'}</Link> },
        { title: currentPage?.pageName || '...' },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{currentPage?.pageName || '...'} — 区块列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>添加区块</Button>
      </div>
      <Table columns={columns} dataSource={blocks} rowKey="id" loading={loading} />

      <Modal title="添加区块" open={open} onOk={handleCreate} onCancel={() => { setOpen(false); form.resetFields(); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="blockName" label="区块名称" rules={[{ required: true }]}>
            <Input placeholder="例如: Banner区" onChange={(e) => {
              const pageCode = currentPage?.pageCode || '';
              const slug = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
              form.setFieldValue('blockCode', slug ? `${pageCode}.c_${slug}` : '');
            }} />
          </Form.Item>
          <Form.Item name="blockCode" label="区块标识" rules={[{ required: true }, { pattern: /^a_[^.]+\.b_[^.]+\.c_[a-zA-Z0-9_]+$/, message: '格式: a_xxx.b_xxx.c_xxx' }]}>
            <Input placeholder="a_main.b_home.c_banner" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
