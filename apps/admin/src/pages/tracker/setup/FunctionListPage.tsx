import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Breadcrumb, Popconfirm, message } from 'antd';
import { PlusOutlined, HomeOutlined } from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useSetupStore } from '../../../stores/setupStore';
import type { SpmFunction } from '../../../types/spm';
import dayjs from 'dayjs';

const { Title } = Typography;

export function FunctionListPage() {
  const { appId, pageId, blockId } = useParams<{ appId: string; pageId: string; blockId: string }>();
  const { functions, loading, currentApp, currentPage, currentBlock, fetchApp, fetchPages, fetchBlocks, fetchFunctions, createFunction, deleteFunction } = useSetupStore();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const aid = Number(appId), pid = Number(pageId), bid = Number(blockId);

  useEffect(() => {
    if (aid) {
      fetchApp(aid);
      fetchPages(aid).then(() => {
        const p = useSetupStore.getState().pages.find(x => x.id === pid);
        if (p) useSetupStore.setState({ currentPage: p });
      });
    }
    if (pid) {
      fetchBlocks(pid).then(() => {
        const b = useSetupStore.getState().blocks.find(x => x.id === bid);
        if (b) useSetupStore.setState({ currentBlock: b });
      });
    }
    if (bid) fetchFunctions(bid);
  }, [aid, pid, bid]);

  const handleCreate = async () => {
    const v = await form.validateFields();
    await createFunction(bid, v);
    message.success('添加成功');
    setOpen(false);
    form.resetFields();
  };

  const columns: ColumnsType<SpmFunction> = [
    { title: '功能名称', dataIndex: 'funcName', key: 'funcName', width: 160 },
    { title: '功能标识', dataIndex: 'funcCode', key: 'funcCode', width: 360, render: (c: string) => <code style={{ fontSize: 12 }}>{c}</code> },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: (t: string) => dayjs(t).format('YYYY-MM-DD') },
    {
      title: '操作', key: 'actions', width: 100,
      render: (_, r) => (
        <Popconfirm title="确定删除?" onConfirm={async () => { await deleteFunction(r.id); message.success('已删除'); }}>
          <Button type="link" size="small" danger>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/setup"><HomeOutlined /> 应用列表</Link> },
        { title: <Link to={`/tracker/setup/${aid}`}>{currentApp?.appName || '...'}</Link> },
        { title: <Link to={`/tracker/setup/${aid}/${pid}`}>{currentPage?.pageName || '...'}</Link> },
        { title: currentBlock?.blockName || '...' },
      ]} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{currentBlock?.blockName || '...'} — 功能列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>添加功能</Button>
      </div>
      <Table columns={columns} dataSource={functions} rowKey="id" loading={loading} />

      <Modal title="添加功能" open={open} onOk={handleCreate} onCancel={() => { setOpen(false); form.resetFields(); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="funcName" label="功能名称" rules={[{ required: true }]}>
            <Input placeholder="例如: 购买按钮" onChange={(e) => {
              const blockCode = currentBlock?.blockCode || '';
              const slug = e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
              form.setFieldValue('funcCode', slug ? `${blockCode}.d_${slug}` : '');
            }} />
          </Form.Item>
          <Form.Item name="funcCode" label="功能标识" rules={[{ required: true }, { pattern: /^a_[^.]+\.b_[^.]+\.c_[^.]+\.d_[a-zA-Z0-9_]+$/, message: '格式: a_xxx.b_xxx.c_xxx.d_xxx' }]}>
            <Input placeholder="a_main.b_home.c_banner.d_btn_buy" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
