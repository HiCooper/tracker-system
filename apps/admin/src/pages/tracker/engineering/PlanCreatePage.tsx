import { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, Typography, Breadcrumb, Space, Divider, message, Collapse, Tag } from 'antd';
import { HomeOutlined, PlusOutlined, DeleteOutlined, SaveOutlined, SendOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePlanStore } from '../../../stores/planStore';
import { useSetupStore } from '../../../stores/setupStore';
import type { PlanEvent, PlanProperty } from '../../../types/trackingPlan';

const { Title, Text } = Typography;
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
    for (const evt of events) {
      if (!evt.eventKey.trim() || !evt.eventName.trim()) {
        message.error('每个事件必须填写标识和名称'); return;
      }
    }
    setSaving(true);
    try {
      if (isEdit && id) { await updatePlan(Number(id), { ...vals, events }); }
      else { await createPlan({ ...vals, events }); }
      message.success(isEdit ? '保存成功' : '创建成功');
      navigate('/tracker/engineering/plans');
    } catch (err: any) { message.error(err.message || '操作失败'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    const vals = await form.validateFields();
    for (const evt of events) {
      if (!evt.eventKey.trim() || !evt.eventName.trim()) {
        message.error('每个事件必须填写标识和名称'); return;
      }
    }
    setSaving(true);
    try {
      let planId = id ? Number(id) : 0;
      if (isEdit) { await updatePlan(planId, { ...vals, events }); await submitForReview(planId); }
      else { const created = await createPlan({ ...vals, events }); planId = created?.id || 0; if (planId) await submitForReview(planId); }
      message.success('已提交审核');
      navigate('/tracker/engineering/plans');
    } catch (err: any) { message.error(err.message || '操作失败'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 12 }} items={[
        { title: <Link to="/tracker/engineering/plans"><HomeOutlined /> 需求方案</Link> },
        { title: isEdit ? '编辑方案' : '新建方案' },
      ]} />
      <Title level={4} style={{ marginBottom: 16, fontWeight: 600, color: '#1E293B' }}>
        <AppstoreOutlined style={{ marginRight: 8, color: '#3B82F6' }} />{isEdit ? '编辑方案' : '新建埋点方案'}
      </Title>

      {/* Meta Info Card */}
      <Card size="small" title={<span style={{ fontWeight: 600 }}>方案信息</span>}
        style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Form form={form} layout="inline" initialValues={{ appId: apps[0]?.id }}>
          <Form.Item name="planName" label="方案名称" rules={[{ required: true, message: '请输入方案名称' }]}>
            <Input placeholder="e.g. v2.3.0 支付流程埋点" style={{ width: 240 }} />
          </Form.Item>
          <Form.Item name="appId" label="目标应用" rules={[{ required: true, message: '请选择应用' }]}>
            <Select style={{ width: 160 }} options={apps.map(a => ({ label: a.appName, value: a.id }))} />
          </Form.Item>
          <Form.Item name="appVersion" label="版本号" rules={[{ required: true, message: '请输入版本号' }]}>
            <Input placeholder="e.g. 2.3.0" style={{ width: 100 }} />
          </Form.Item>
        </Form>
      </Card>

      {/* Events */}
      <Card size="small"
        title={<span style={{ fontWeight: 600 }}>事件列表 ({events.length})</span>}
        extra={<Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addEvent}>添加事件</Button>}
        style={{ marginBottom: 24, borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Collapse accordion style={{ background: '#fff' }}>
          {events.map((evt, i) => (
            <Panel
              key={i}
              header={
                <Space>
                  <Text strong>{evt.eventName || `事件 ${i + 1} (未命名)`}</Text>
                  {evt.category && <Tag style={{ borderRadius: 4 }}>{evt.category}</Tag>}
                </Space>
              }
              extra={
                <Button type="text" size="small" danger icon={<DeleteOutlined />}
                  onClick={(e) => { e.stopPropagation(); if (events.length > 1) removeEvent(i); else message.warning('至少保留一个事件'); }} />
              }>
              <Space wrap style={{ marginBottom: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>事件标识</Text>
                  <Input value={evt.eventKey} style={{ width: 200 }} onChange={(e) => updateEvent(i, 'eventKey', e.target.value)} placeholder="e.g. click_buy_now" />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>事件名称</Text>
                  <Input value={evt.eventName} style={{ width: 180 }} onChange={(e) => updateEvent(i, 'eventName', e.target.value)} placeholder="e.g. 点击立即购买" />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>分类</Text>
                  <Select value={evt.category} style={{ width: 180 }} onChange={(v) => updateEvent(i, 'category', v)} options={EVENT_CATEGORIES} />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>描述</Text>
                  <Input value={evt.description} style={{ width: 200 }} onChange={(e) => updateEvent(i, 'description', e.target.value)} placeholder="可选描述" />
                </div>
              </Space>

              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>属性 ({evt.properties.length})</Text>
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
      </Card>

      {/* Actions */}
      <div style={{ textAlign: 'right', background: '#fff', padding: '12px 16px',
        borderRadius: 8, border: '1px solid #DBEAFE', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <Space>
          <Button icon={<SaveOutlined />} onClick={handleSave} loading={saving} size="large">保存草稿</Button>
          <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} loading={saving} size="large">提交审核</Button>
        </Space>
      </div>
    </div>
  );
}
