import { useEffect, useState } from 'react';
import {
  Table, Button, Input, Space, Tag, Popconfirm, message, Typography, Modal, Form,
} from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSpmStore } from '../../../stores/spmStore';
import type { SpmVO } from '../../../types/spm';
import dayjs from 'dayjs';

const { Title } = Typography;

export function SpmListPage() {
  const {
    spms, loading, total, page, size, keyword,
    fetchList, create, update, remove,
    setPage, setSize, setKeyword,
  } = useSpmStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSpm, setEditingSpm] = useState<SpmVO | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchList();
  }, [page, size, keyword, fetchList]);

  const handleCreate = () => {
    setEditingSpm(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: SpmVO) => {
    setEditingSpm(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      message.success('删除成功');
    } catch {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingSpm) {
        await update(editingSpm.id, values);
        message.success('更新成功');
      } else {
        await create(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    }
  };

  const columns: ColumnsType<SpmVO> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: 'SPM编码', dataIndex: 'spmCode', key: 'spmCode', width: 200,
      render: (code: string) => <Tag color="blue" style={{ fontFamily: 'monospace' }}>{code}</Tag>,
    },
    { title: 'SPM名称', dataIndex: 'spmName', key: 'spmName', width: 180 },
    { title: 'A层(页面)', dataIndex: 'spmaLabel', key: 'spmaLabel', width: 120 },
    { title: 'B层(模块)', dataIndex: 'spmbLabel', key: 'spmbLabel', width: 120 },
    { title: 'C层(位置)', dataIndex: 'spmcLabel', key: 'spmcLabel', width: 120 },
    { title: 'D层(元素)', dataIndex: 'spmdLabel', key: 'spmdLabel', width: 120 },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作', key: 'actions', width: 160, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>SPM管理</Title>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Input
            placeholder="搜索SPM编码/名称"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchList()}>刷新</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建SPM</Button>
      </div>

      <Table
        columns={columns}
        dataSource={spms}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1300 }}
        pagination={{
          current: page, pageSize: size, total,
          showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
          onChange: (p, s) => { setPage(p); setSize(s); },
        }}
      />

      <Modal
        title={editingSpm ? '编辑SPM' : '新建SPM'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        destroyOnClose
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="spmCode"
            label="SPM编码"
            rules={[
              { required: true, message: '请输入SPM编码' },
              { max: 64, message: '不超过64个字符' },
              { pattern: /^[A-Z0-9_]+$/, message: '仅支持大写字母、数字、下划线' },
            ]}
          >
            <Input placeholder="例如: HOME_BANNER_TOP" style={{ fontFamily: 'monospace' }} disabled={!!editingSpm} />
          </Form.Item>
          <Form.Item
            name="spmName"
            label="SPM名称"
            rules={[{ required: true, message: '请输入SPM名称' }]}
          >
            <Input placeholder="例如: 首页顶部Banner" />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="spmaLabel" label="A层标签" style={{ flex: 1 }}>
              <Input placeholder="页面级" />
            </Form.Item>
            <Form.Item name="spmbLabel" label="B层标签" style={{ flex: 1 }}>
              <Input placeholder="模块级" />
            </Form.Item>
          </Space>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="spmcLabel" label="C层标签" style={{ flex: 1 }}>
              <Input placeholder="位置级" />
            </Form.Item>
            <Form.Item name="spmdLabel" label="D层标签" style={{ flex: 1 }}>
              <Input placeholder="元素级" />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="SPM 描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
