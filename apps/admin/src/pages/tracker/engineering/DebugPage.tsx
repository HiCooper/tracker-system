import { useEffect, useRef, useState } from 'react';
import { Card, Row, Col, Typography, Breadcrumb, Button, Select, Tag, Space, Statistic, Descriptions, Input } from 'antd';
import { HomeOutlined, PauseCircleOutlined, PlayCircleOutlined, ClearOutlined, WifiOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useDebugStore, generateMockEvent } from '../../../stores/debugStore';
import type { DebugEvent } from '../../../types/debug';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const EVENT_TYPE_COLORS: Record<string, string> = {
  page_view: 'blue', click: 'green', exposure: 'orange', scroll: 'purple', custom: 'default',
};

export function DebugPage() {
  const { events, paused, connected, filter, addEvent, clearEvents, setPaused, setFilter, getFilteredEvents, getStats } =
    useDebugStore();
  const [selectedEvent, setSelectedEvent] = useState<DebugEvent | null>(null);
  const [userIdFilter, setUserIdFilter] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !paused) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events.length, paused]);

  // Simulate incoming events
  useEffect(() => {
    const interval = setInterval(() => {
      if (!paused && connected) addEvent(generateMockEvent());
    }, 1500 + Math.random() * 2500);
    return () => clearInterval(interval);
  }, [paused, connected]);

  const stats = getStats();
  const displayed = getFilteredEvents().slice(-100);

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/engineering/debug"><HomeOutlined /> Debug 验证</Link> },
      ]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>实时事件调试</Title>
          <Tag icon={<WifiOutlined />} color={connected ? 'success' : 'error'}>{connected ? '已连接' : '已断开'}</Tag>
        </Space>
        <Space>
          <Select allowClear placeholder="事件类型" style={{ width: 120 }}
            onChange={(v) => setFilter({ ...filter, eventType: v })}
            options={[{ label: 'page_view', value: 'page_view' }, { label: 'click', value: 'click' }, { label: 'exposure', value: 'exposure' }]} />
          <Input placeholder="用户ID" style={{ width: 130 }} value={userIdFilter}
            onChange={(e) => { setUserIdFilter(e.target.value); setFilter({ ...filter, userId: e.target.value || undefined }); }} allowClear />
          <Button icon={paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            onClick={() => setPaused(!paused)}>{paused ? '继续' : '暂停'}</Button>
          <Button icon={<ClearOutlined />} onClick={clearEvents}>清空</Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={16}>
          <Card size="small" title={`事件流 (${stats.total})`} bodyStyle={{ padding: 0 }}>
            <div ref={containerRef} style={{ height: 520, overflow: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
              {displayed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>等待事件...</div>
              ) : (
                displayed.map((e) => (
                  <div key={e.eventId} onClick={() => setSelectedEvent(e)}
                    style={{ padding: '6px 12px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer',
                      background: selectedEvent?.eventId === e.eventId ? '#e6f4ff' : undefined }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(e.timestamp).format('HH:mm:ss.SSS')}</Text>
                    <Tag color={EVENT_TYPE_COLORS[e.eventType] || 'default'} style={{ marginLeft: 8, fontSize: 10 }}>{e.eventType}</Tag>
                    <Text style={{ marginLeft: 8, color: '#333' }}>{e.eventId}</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>{e.userId}</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>{e.pageUrl}</Text>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card size="small" title="统计" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}><Statistic title="总数" value={stats.total} /></Col>
              <Col span={12}><Statistic title="暂停" value={paused ? '是' : '否'} /></Col>
            </Row>
            <div style={{ marginTop: 12 }}>
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Tag color={EVENT_TYPE_COLORS[type]}>{type}</Tag>
                  <Text>{count}</Text>
                </div>
              ))}
            </div>
          </Card>

          {selectedEvent && (
            <Card size="small" title="事件详情">
              <Descriptions column={1} size="small" labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }}>
                <Descriptions.Item label="eventId"><code>{selectedEvent.eventId}</code></Descriptions.Item>
                <Descriptions.Item label="eventType">{selectedEvent.eventType}</Descriptions.Item>
                <Descriptions.Item label="时间">{selectedEvent.timestamp}</Descriptions.Item>
                <Descriptions.Item label="userId">{selectedEvent.userId}</Descriptions.Item>
                <Descriptions.Item label="sessionId">{selectedEvent.sessionId}</Descriptions.Item>
                <Descriptions.Item label="pageUrl">{selectedEvent.pageUrl}</Descriptions.Item>
                <Descriptions.Item label="SPM">{selectedEvent.spmCode}</Descriptions.Item>
                {selectedEvent.elementId && <Descriptions.Item label="elementId">{selectedEvent.elementId}</Descriptions.Item>}
              </Descriptions>
              <div style={{ marginTop: 8 }}>
                <Text strong style={{ fontSize: 11 }}>Properties</Text>
                <pre style={{ fontSize: 10, background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4, maxHeight: 150, overflow: 'auto' }}>
                  {JSON.stringify(selectedEvent.properties, null, 2)}
                </pre>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
