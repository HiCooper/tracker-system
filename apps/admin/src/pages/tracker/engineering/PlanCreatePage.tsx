import { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, Typography, Breadcrumb, Space, Divider, message, Collapse } from 'antd';
import { HomeOutlined, PlusOutlined, DeleteOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePlanStore } from '../../../stores/planStore';
import { useSetupStore } from '../../../stores/setupStore';
import type { PlanEvent, PlanProperty } from '../../../types/trackingPlan';

const { Title } = Typography;
const { Panel } = Collapse;

const EVENT_CATEGORIES = [
  { label: '页面浏览 (page_view)', value: 'page_view' },
  { label: '点击 (click)', value: 'click' },
  { label: '曝光 (exposure)', value: 'exposure' },
  { label: '自定义 (custom)', value: 'custom' },
];

const DATA_TYPES = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: '日期', value: 'date' },
];

function emptyEvent(): PlanEvent {
  return { eventKey: '', eventName: '', category: 'click', description: '', properties: [] };
}

function emptyProp(): PlanProperty {
  return { propKey: '', propName: '', dataType: 'string' };
}

export function PlanCreatePage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { createPlan, updatePlan, submitForReview } = usePlanStore();
  const { apps, fetchApps } = useSetupStore();

  useEffect(() => { fetchApps(); }, []);

  const [form] = Form.useForm();
  const [events, setEvents] = useState<PlanEvent[]>([emptyEvent()]);
  const [saving, setSaving] = useState(false);

  const addEvent = () => setEvents([...events, emptyEvent()]);
  const removeEvent = (idx: number) => setEvents(events.filter((_, i) => i !== idx));
  const updateEvent = (idx: number, field: keyof PlanEvent, val: string) => {
    const next = [...events];
    (next[idx] as unknown as Record<string, unknown>)[field] = val;
    setEvents(next);
  };

  const addProp = (evtIdx: number) => {
    const next = [...events];
    next[evtIdx] = { ...next[evtIdx], properties: [...next[evtIdx].properties, emptyProp()] };
    setEvents(next);
  };
  const removeProp = (evtIdx: number, propIdx: number) => {
    const next = [...events];
    next[evtIdx] = { ...next[evtIdx], properties: next[evtIdx].properties.filter((_, i) => i !== propIdx) };
    setEvents(next);
  };
  const updateProp = (evtIdx: number, propIdx: number, field: keyof PlanProperty, val: string) => {
    const next = [...events];
    const props = [...next[evtIdx].properties];
    (props[propIdx] as unknown as Record<string, unknown>)[field] = val;
    next[evtIdx] = { ...next[evtIdx], properties: props };
    setEvents(next);
  };

  const handleSave = async () => {
    const vals = await form.validateFields();
    // Validate events have at least key and name
    for (const evt of events) {
      if (!evt.eventKey.trim() || !evt.eventName.trim()) {
        message.error('每个事件必须填写标识和名称');
        return;
      }
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await updatePlan(Number(id), { ...vals, events });
      } else {
        await createPlan({ ...vals, events });
      }
      message.success(isEdit ? '保存成功' : '创建成功');
      navigate('/tracker/engineering/plans');
    } catch (err: any) {
      message.error(err.message || '操作失败');
    } finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    const vals = await form.validateFields();
    // Validate events
    for (const evt of events) {
      if (!evt.eventKey.trim() || !evt.eventName.trim()) {
        message.error('每个事件必须填写标识和名称');
        return;
      }
    }
    setSaving(true);
    try {
      let planId = id ? Number(id) : 0;
      if (isEdit) {
        await updatePlan(planId, { ...vals, events });
        await submitForReview(planId);
      } else {
        const created = await createPlan({ ...vals, events });
        planId = created?.id || 0;
        if (planId) await submitForReview(planId);
      }
      message.success('已提交审核');
      navigate('/tracker/engineering/plans');
    } catch (err: any) {
      message.error(err.message || '操作失败');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/engineering/plans"><HomeOutlined /> 需求方案</Link> },
        { title: isEdit ? '编辑方案' : '新建方案' },
      ]} />
      <Title level={4} style={{ marginBottom: 16 }}>{isEdit ? '编辑方案' : '新建埋点方案'}</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" initialValues={{ appId: 1 }}>
          <Form.Item name="planName" label="方案名称" rules={[{ required: true, message: '请输入方案名称' }]}>
            <Input placeholder="e.g. v2.3.0 支付流程埋点" style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="appId" label="应用" rules={[{ required: true }]}>
            <Select style={{ width: 160 }} options={apps.map(a => ({ label: a.appName, value: a.id }))} />
          </Form.Item>
          <Form.Item name="appVersion" label="版本号" rules={[{ required: true, message: '请输入版本号' }]}>
            <Input placeholder="e.g. 2.3.0" style={{ width: 120 }} />
          </Form.Item>
        </Form>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>事件列表</Title>
        <Button type="dashed" icon={<PlusOutlined />} onClick={addEvent}>添加事件</Button>
      </div>

      <Collapse accordion>
        {events.map((evt, i) => (
          <Panel
            key={i}
            header={`事件 ${i + 1}: ${evt.eventName || '(未命名)'}`}
            extra={<Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); removeEvent(i); }} />}
          >
            <Space wrap style={{ marginBottom: 12 }}>
              <Input addonBefore="标识" value={evt.eventKey} style={{ width: 200 }} onChange={(e) => updateEvent(i, 'eventKey', e.target.value)} placeholder="e.g. click_buy_now" />
              <Input addonBefore="名称" value={evt.eventName} style={{ width: 200 }} onChange={(e) => updateEvent(i, 'eventName', e.target.value)} placeholder="e.g. 点击立即购买" />
              <Select value={evt.category} style={{ width: 180 }} onChange={(v) => updateEvent(i, 'category', v)} options={EVENT_CATEGORIES} />
              <Input addonBefore="描述" value={evt.description} style={{ width: 200 }} onChange={(e) => updateEvent(i, 'description', e.target.value)} placeholder="可选" />
            </Space>

            <Divider style={{ margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#666' }}>属性</span>
              <Button type="link" size="small" icon={<PlusOutlined />} onClick={() => addProp(i)}>添加属性</Button>
            </div>

            {evt.properties.map((prop, j) => (
              <Space key={j} style={{ marginBottom: 6 }}>
                <Input size="small" placeholder="prop_key" value={prop.propKey} style={{ width: 140 }} onChange={(e) => updateProp(i, j, 'propKey', e.target.value)} />
                <Input size="small" placeholder="属性名" value={prop.propName} style={{ width: 120 }} onChange={(e) => updateProp(i, j, 'propName', e.target.value)} />
                <Select size="small" value={prop.dataType} style={{ width: 90 }} onChange={(v) => updateProp(i, j, 'dataType', v)} options={DATA_TYPES} />
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeProp(i, j)} />
              </Space>
            ))}
          </Panel>
        ))}
      </Collapse>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button icon={<SaveOutlined />} onClick={handleSave} loading={saving}>保存草稿</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} loading={saving}>提交审核</Button>
        </Space>
      </div>
    </div>
  );
}
