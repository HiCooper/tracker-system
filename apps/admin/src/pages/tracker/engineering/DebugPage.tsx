import { useEffect, useRef, useState } from 'react';
import { Card, Row, Col, Typography, Breadcrumb, Button, Select, Tag, Space, Statistic, Descriptions, message, Empty } from 'antd';
import {
  HomeOutlined, PauseCircleOutlined, PlayCircleOutlined, ClearOutlined,
  WifiOutlined, QrcodeOutlined, StopOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useDebugStore, type SessionStatus } from '../../../stores/debugStore';
import { useSetupStore } from '../../../stores/setupStore';
import type { DebugEvent } from '../../../types/debug';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const EVENT_TYPE_COLORS: Record<string, string> = {
  page_view: 'blue', click: 'green', exposure: 'orange', scroll: 'purple', custom: 'default',
};

const STATUS_LABELS: Record<SessionStatus, { color: string; label: string }> = {
  idle: { color: 'default', label: '未启动' },
  creating: { color: 'processing', label: '创建中...' },
  waiting: { color: 'warning', label: '等待设备扫码' },
  connected: { color: 'success', label: '已连接' },
  closed: { color: 'default', label: '已结束' },
};

export function DebugPage() {
  const {
    events, paused, connected, sessionId, sessionStatus,
    setAppCode, createSession, closeSession, clearEvents, setPaused, getFilteredEvents, getStats,
  } = useDebugStore();
  const { apps, fetchApps } = useSetupStore();
  const [selectedEvent, setSelectedEvent] = useState<DebugEvent | null>(null);
  const [selectedApp, setSelectedApp] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [qrValue, setQrValue] = useState('');

  useEffect(() => { fetchApps(); }, []);

  useEffect(() => {
    if (containerRef.current && !paused) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events.length, paused]);

  const handleStartDebug = async () => {
    if (!selectedApp) { message.warning('请先选择应用'); return; }
    clearEvents();
    try {
      setAppCode(selectedApp);
      await createSession(selectedApp);
      const sid = useDebugStore.getState().sessionId;
      if (sid) {
        const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/debug/sdk/${sid}`;
        setQrValue(JSON.stringify({ sessionId: sid, wsUrl, appCode: selectedApp }));
      }
      message.success('调试会话已创建，请扫码连接');
    } catch {
      message.error('创建调试会话失败');
    }
  };

  const handleStopDebug = () => {
    closeSession();
    setQrValue('');
    message.info('调试会话已结束');
  };

  const stats = getStats();
  const displayed = getFilteredEvents().slice(-100);
  const statusInfo = STATUS_LABELS[sessionStatus];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/engineering/debug"><HomeOutlined /> Debug 验证</Link> },
      ]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>实时事件调试</Title>
          <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
          {connected && <Tag icon={<WifiOutlined />} color="success">已连接</Tag>}
        </Space>
        <Space>
          <Select placeholder="选择应用" style={{ width: 140 }}
            value={selectedApp || undefined} onChange={(v) => { setSelectedApp(v || ''); setAppCode(v || ''); }}
            options={apps.map(a => ({ label: a.appName, value: a.appCode }))}
            disabled={sessionStatus === 'connected' || sessionStatus === 'waiting'}
          />
          {sessionStatus === 'idle' || sessionStatus === 'closed' ? (
            <Button type="primary" icon={<QrcodeOutlined />} onClick={handleStartDebug}>开始调试</Button>
          ) : (
            <Button danger icon={<StopOutlined />} onClick={handleStopDebug}>结束调试</Button>
          )}
          <Button icon={paused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            onClick={() => setPaused(!paused)} disabled={events.length === 0}>
            {paused ? '继续' : '暂停'}
          </Button>
          <Button icon={<ClearOutlined />} onClick={clearEvents} disabled={events.length === 0}>清空</Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={16}>
          {(sessionStatus === 'waiting' || sessionStatus === 'connected') && qrValue ? (
            <Card size="small" title={
              <Space>
                <QrcodeOutlined />
                <span>调试二维码</span>
                <Tag color={sessionStatus === 'connected' ? 'success' : 'warning'}>
                  {sessionStatus === 'connected' ? '设备已连接' : '等待扫码'}
                </Tag>
              </Space>
            } style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', padding: 24 }}>
                <QRCodeSVG value={qrValue} size={220} level="M" />
                <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                  Session: <code>{sessionId}</code>
                </div>
                <div style={{ marginTop: 4, fontSize: 11, color: '#bbb' }}>
                  扫码后 SDK 自动建立 WebSocket 连接，事件实时推送
                </div>
              </div>
            </Card>
          ) : sessionStatus === 'idle' || sessionStatus === 'closed' ? (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Empty description="选择应用并点击「开始调试」创建调试会话" style={{ padding: 40 }} />
            </Card>
          ) : null}

          <Card size="small" title={`事件流 (${stats.total})`} bodyStyle={{ padding: 0 }}>
            <div ref={containerRef} style={{
              height: sessionStatus === 'waiting' ? 260 : 440, overflow: 'auto',
              fontFamily: 'monospace', fontSize: 12,
            }}>
              {displayed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                  {sessionStatus === 'connected' ? '等待事件...' :
                   sessionStatus === 'waiting' ? '等待设备扫码连接...' :
                   '点击「开始调试」创建会话'}
                </div>
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
