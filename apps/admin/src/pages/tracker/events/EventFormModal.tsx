import { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { useEventStore } from '../../../stores/eventStore';
import type { EventVO } from '../../../types/event';

interface Props {
  open: boolean;
  event: EventVO | null;
  onClose: () => void;
}

export function EventFormModal({ open, event, onClose }: Props) {
  const [form] = Form.useForm();
  const { create, update } = useEventStore();
  const isEdit = !!event;

  useEffect(() => {
    if (open) {
      if (event) {
        form.setFieldsValue(event);
      } else {
        form.resetFields();
      }
    }
  }, [open, event, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit && event) {
        await update(event.id, values);
        message.success('更新成功');
      } else {
        await create(values);
        message.success('创建成功');
      }
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑事件' : '新建事件'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ category: 'custom', status: 1 }}
      >
        <Form.Item
          name="eventKey"
          label="事件标识"
          rules={[
            { required: true, message: '请输入事件标识' },
            { max: 64, message: '不超过64个字符' },
            { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '格式: 字母/下划线开头，字母数字下划线' },
          ]}
        >
          <Input placeholder="例如: click_buy_button" disabled={isEdit} />
        </Form.Item>

        <Form.Item
          name="eventName"
          label="事件名称"
          rules={[{ required: true, message: '请输入事件名称' }, { max: 128, message: '不超过128个字符' }]}
        >
          <Input placeholder="例如: 购买按钮点击" />
        </Form.Item>

        <Form.Item
          name="category"
          label="事件分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select
            options={[
              { label: '页面浏览 (page_view)', value: 'page_view' },
              { label: '点击事件 (click)', value: 'click' },
              { label: '曝光事件 (exposure)', value: 'exposure' },
              { label: '自定义 (custom)', value: 'custom' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="status"
          label="状态"
        >
          <Select
            options={[
              { label: '启用', value: 1 },
              { label: '禁用', value: 0 },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
          rules={[{ max: 512, message: '不超过512个字符' }]}
        >
          <Input.TextArea rows={3} placeholder="事件描述（可选）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
