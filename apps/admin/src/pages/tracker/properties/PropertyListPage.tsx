import { useEffect, useState } from 'react';
import {
  Table, Button, Select, Space, Tag, Popconfirm, message, Typography, Modal, Form, Input,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePropertyStore } from '../../../stores/propertyStore';
import { useEventStore } from '../../../stores/eventStore';
import type { PropertyVO } from '../../../types/property';
import type { EventVO } from '../../../types/event';
import dayjs from 'dayjs';

const { Title } = Typography;

const dataTypeColors: Record<string, string> = {
  string: 'blue', number: 'green', boolean: 'orange', date: 'purple',
};

export function PropertyListPage() {
  const { properties, loading, selectedEventId, fetchProperties, create, remove } = usePropertyStore();
  const { events, fetchList: fetchEvents } = useEventStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (selectedEventId) {
      fetchProperties(selectedEventId);
    }
  }, [selectedEventId, fetchProperties]);

  const handleEventChange = (eventId: number) => {
    fetchProperties(eventId);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await create({ ...values, eventId: selectedEventId! });
      message.success('创建成功');
      setModalOpen(false);
      form.resetFields();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      message.success('删除成功');
    } catch {
      message.error('删除失败');
    }
  };

  const columns: ColumnsType<PropertyVO> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '属性标识', dataIndex: 'propKey', key: 'propKey', width: 180 },
    { title: '属性名称', dataIndex: 'propName', key: 'propName', width: 160 },
    {
      title: '数据类型', dataIndex: 'dataType', key: 'dataType', width: 100,
      render: (t: string) => <Tag color={dataTypeColors[t]}>{t}</Tag>,
    },
    { title: '关联事件', dataIndex: 'eventName', key: 'eventName', width: 160 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作', key: 'actions', width: 100,
      render: (_, record) => (
        <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" size="small" danger>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>属性管理</Title>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Space>
          <Select
            showSearch
            placeholder="选择事件"
            style={{ width: 300 }}
            value={selectedEventId}
            onChange={handleEventChange}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={events.map((e: EventVO) => ({
              label: `${e.eventName} (${e.eventKey})`,
              value: e.id,
            }))}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!selectedEventId}
          onClick={() => setModalOpen(true)}
        >
          新建属性
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={properties}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
        locale={{ emptyText: selectedEventId ? '该事件暂无属性' : '请先选择一个事件' }}
      />

      <Modal
        title="新建属性"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ dataType: 'string' }}>
          <Form.Item
            name="propKey"
            label="属性标识"
            rules={[
              { required: true, message: '请输入属性标识' },
              { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '格式不正确' },
            ]}
          >
            <Input placeholder="例如: product_id" />
          </Form.Item>
          <Form.Item
            name="propName"
            label="属性名称"
            rules={[{ required: true, message: '请输入属性名称' }]}
          >
            <Input placeholder="例如: 商品ID" />
          </Form.Item>
          <Form.Item name="dataType" label="数据类型">
            <Select
              options={[
                { label: 'string (字符串)', value: 'string' },
                { label: 'number (数字)', value: 'number' },
                { label: 'boolean (布尔)', value: 'boolean' },
                { label: 'date (日期)', value: 'date' },
              ]}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="属性描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
