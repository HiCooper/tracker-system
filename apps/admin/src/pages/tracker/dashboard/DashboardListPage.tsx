import { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Breadcrumb, Space, Popconfirm, Modal, Form, Input, message, Tag } from 'antd';
import { HomeOutlined, PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useDashboardStore } from '../../../stores/dashboardStore';
import type { DashboardVO } from '../../../services/dashboardApi';
import dayjs from 'dayjs';

const { Title } = Typography;

export function DashboardListPage() {
  const { dashboards, loading, fetchList, create, remove, fetchOne, currentDashboard, dashboardData, fetchData } =
    useDashboardStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { fetchList(); }, []);

  const handleCreate = async () => {
    const vals = await form.validateFields();
    const config = JSON.stringify({
      panels: [
        { id: 'panel_1', type: 'metric', title: '事件总数', query: { aggregation: 'count', label: '事件总数' } },
      ],
    });
    await create({ ...vals, config });
    message.success('创建成功');
    setModalOpen(false);
    form.resetFields();
    fetchList();
  };

  const handleView = async (id: number) => {
    await fetchOne(id);
    await fetchData(id);
    setViewOpen(true);
  };

  const columns: ColumnsType<DashboardVO> = [
    { title: '看板名称', dataIndex: 'name', key: 'name', width: 200 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    {
      title: '操作', key: 'actions', width: 180,
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(r.id)}>查看</Button>
          <Popconfirm title="确定删除?" onConfirm={async () => { await remove(r.id); message.success('已删除'); fetchList(); }}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/dashboards"><HomeOutlined /> 数据看板</Link> },
      ]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>数据看板</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新建看板</Button>
      </div>

      <Table columns={columns} dataSource={dashboards} rowKey="id" loading={loading} pagination={false} />

      {/* Create Modal */}
      <Modal title="新建看板" open={modalOpen} onOk={handleCreate} onCancel={() => { setModalOpen(false); form.resetFields(); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="看板名称" rules={[{ required: true }]}>
            <Input placeholder="e.g. 整体趋势看板" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>

      {/* View Data Modal */}
      <Modal
        title={currentDashboard?.name || '看板数据'}
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={<Button onClick={() => setViewOpen(false)}>关闭</Button>}
        width={800}
      >
        {dashboardData ? (
          <div>
            {dashboardData.panels.map((p) => (
              <Card key={p.panelId} size="small" style={{ marginBottom: 12 }}
                title={<Space>{p.title} <Tag>{p.type}</Tag></Space>}>
                {p.error ? (
                  <div style={{ color: '#ff4d4f' }}>错误: {p.error}</div>
                ) : (
                  <pre style={{ fontSize: 12, background: '#f5f5f5', padding: 12, borderRadius: 4, margin: 0 }}>
                    {JSON.stringify(p.result, null, 2)}
                  </pre>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>暂无数据</div>
        )}
      </Modal>
    </div>
  );
}
