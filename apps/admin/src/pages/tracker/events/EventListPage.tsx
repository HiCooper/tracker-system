import { useEffect, useState } from 'react';
import {
  Table, Button, Input, Select, Space, Tag, Popconfirm, message, Typography,
} from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useEventStore } from '../../../stores/eventStore';
import { EventFormModal } from './EventFormModal';
import type { EventVO } from '../../../types/event';
import dayjs from 'dayjs';

const { Title } = Typography;

const categoryColors: Record<string, string> = {
  page_view: 'blue',
  click: 'orange',
  exposure: 'green',
  custom: 'purple',
};

const categoryLabels: Record<string, string> = {
  page_view: '页面浏览',
  click: '点击事件',
  exposure: '曝光事件',
  custom: '自定义',
};

export function EventListPage() {
  const {
    events, loading, total, page, size,
    keyword, category,
    fetchList, remove,
    setPage, setSize, setKeyword, setCategory,
  } = useEventStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventVO | null>(null);

  useEffect(() => {
    fetchList();
  }, [page, size, keyword, category, fetchList]);

  const handleCreate = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  const handleEdit = (record: EventVO) => {
    setEditingEvent(record);
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

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingEvent(null);
  };

  const columns: ColumnsType<EventVO> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: '事件标识', dataIndex: 'eventKey', key: 'eventKey', width: 180,
    },
    {
      title: '事件名称', dataIndex: 'eventName', key: 'eventName', width: 160,
    },
    {
      title: '分类', dataIndex: 'category', key: 'category', width: 120,
      render: (cat: string) => <Tag color={categoryColors[cat]}>{categoryLabels[cat] || cat}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: number) => (s === 1 ? <Tag color="success">启用</Tag> : <Tag color="default">禁用</Tag>),
    },
    {
      title: '描述', dataIndex: 'description', key: 'description', ellipsis: true,
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作', key: 'actions', width: 180, fixed: 'right',
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
      <Title level={4} style={{ marginBottom: 16 }}>事件管理</Title>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <Space wrap>
          <Input
            placeholder="搜索事件标识/名称"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="分类筛选"
            value={category || undefined}
            onChange={(v) => setCategory(v || '')}
            allowClear
            style={{ width: 140 }}
            options={[
              { label: '页面浏览', value: 'page_view' },
              { label: '点击事件', value: 'click' },
              { label: '曝光事件', value: 'exposure' },
              { label: '自定义', value: 'custom' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchList()}>刷新</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建事件</Button>
      </div>

      <Table
        columns={columns}
        dataSource={events}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{
          current: page, pageSize: size, total,
          showSizeChanger: true, showTotal: (t) => `共 ${t} 条`,
          onChange: (p, s) => { setPage(p); setSize(s); },
        }}
      />

      <EventFormModal
        open={modalOpen}
        event={editingEvent}
        onClose={handleModalClose}
      />
    </div>
  );
}
