import { useEffect, useState } from 'react';
import {
  Card, Row, Col, DatePicker, Typography, Breadcrumb, Button, Space, Spin, Tooltip,
} from 'antd';
import { HomeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { useExperienceStore } from '../../../stores/experienceStore';
import { useSetupStore } from '../../../stores/setupStore';
import type { PortraitDimension } from '../../../services/experienceApi';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DIM_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#f5222d', '#faad14', '#2f54eb', '#a0d911'];

// ============ Horizontal Bar Chart ============

function BarChart({ data, title }: { data: PortraitDimension[]; title: string }) {
  const maxPct = Math.max(...data.map((d) => d.percentage), 0.01);
  return (
    <div>
      <Text strong style={{ fontSize: 12, color: '#666', marginBottom: 8, display: 'block' }}>{title}</Text>
      {data.map((d, i) => (
        <div key={d.value} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
            <Text style={{ fontSize: 12 }}>{d.label}</Text>
            <Text style={{ fontSize: 12, color: '#999' }}>
              {d.count.toLocaleString()} ({(d.percentage * 100).toFixed(1)}%)
            </Text>
          </div>
          <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(d.percentage / maxPct) * 100}%`,
              background: DIM_COLORS[i % DIM_COLORS.length], borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Activity Heatmap ============

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function ActivityHeatmap({ data }: { data: { hour: number; dayOfWeek: number; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const getColor = (count: number) => {
    const i = count / maxCount;
    if (i === 0) return '#f5f5f5';
    if (i < 0.25) return '#d6e4ff';
    if (i < 0.5) return '#91caff';
    if (i < 0.75) return '#4096ff';
    return '#1677ff';
  };

  return (
    <div>
      <Text strong style={{ fontSize: 12, color: '#666', marginBottom: 8, display: 'block' }}>
        用户活跃时段分布（事件量）
      </Text>
      <div style={{ display: 'flex', fontSize: 11, color: '#999' }}>
        <div style={{ width: 32 }} />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ flex: 1, textAlign: 'center' }}>{h}</div>
        ))}
      </div>
      {DAY_LABELS.map((label, d) => (
        <div key={d} style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
          <div style={{ width: 32, fontSize: 11, color: '#999', textAlign: 'center' }}>{label}</div>
          {Array.from({ length: 24 }, (_, h) => {
            const point = data.find((p) => p.dayOfWeek === d && p.hour === h);
            const count = point?.count || 0;
            return (
              <Tooltip key={h} title={`周${label} ${h}:00 — ${count.toLocaleString()} 事件`}>
                <div style={{
                  flex: 1, height: 16, margin: 1, borderRadius: 2,
                  background: getColor(count), cursor: 'pointer',
                }} />
              </Tooltip>
            );
          })}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: '#999' }}>
        <span>低</span>
        {['#f5f5f5', '#d6e4ff', '#91caff', '#4096ff', '#1677ff'].map((c) => (
          <div key={c} style={{ width: 14, height: 14, background: c, borderRadius: 2 }} />
        ))}
        <span>高</span>
      </div>
    </div>
  );
}

// ============ Main Page ============

export function UserPortraitPage() {
  const { appCode } = useParams<{ appCode: string }>();
  const { apps, fetchApps } = useSetupStore();
  const { portrait, portraitLoading, fetchPortrait } = useExperienceStore();

  const [timeRange, setTimeRange] = useState<[string, string]>([
    dayjs().subtract(7, 'd').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);
  const [analyzed, setAnalyzed] = useState(false);

  useEffect(() => { fetchApps(); }, []);

  const appName = apps.find((a) => a.appCode === appCode)?.appName || appCode;

  const handleAnalyze = async () => {
    if (!appCode) return;
    await fetchPortrait({ appCode, startTime: timeRange[0], endTime: timeRange[1] });
    setAnalyzed(true);
  };

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/advanced"><HomeOutlined /> 高级分析</Link> },
        { title: appName || '' },
        { title: '用户画像' },
      ]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>用户画像</Title>
        <Space>
          <span style={{ fontSize: 12, color: '#999' }}>时间:</span>
          <RangePicker
            size="small"
            value={[dayjs(timeRange[0]), dayjs(timeRange[1])]}
            onChange={(d) => {
              if (d?.[0] && d?.[1]) setTimeRange([d[0].format('YYYY-MM-DD'), d[1].format('YYYY-MM-DD')]);
            }}
            presets={[
              { label: '过去7天', value: [dayjs().subtract(6, 'd'), dayjs()] },
              { label: '过去30天', value: [dayjs().subtract(29, 'd'), dayjs()] },
            ]}
          />
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleAnalyze} loading={portraitLoading}>
            分析
          </Button>
        </Space>
      </div>

      {!analyzed && !portraitLoading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
          <HomeOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
          点击"分析"查看用户群体特征
        </div>
      ) : portraitLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : portrait ? (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}><Card size="small"><BarChart data={portrait.deviceType} title="设备类型" /></Card></Col>
            <Col span={8}><Card size="small"><BarChart data={portrait.os} title="操作系统" /></Card></Col>
            <Col span={8}><Card size="small"><BarChart data={portrait.browser} title="浏览器" /></Card></Col>
          </Row>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}><Card size="small"><BarChart data={portrait.language} title="语言偏好" /></Card></Col>
            <Col span={8}><Card size="small"><BarChart data={portrait.screenResolution} title="屏幕分辨率" /></Card></Col>
            <Col span={8}><Card size="small"><BarChart data={portrait.source} title="流量来源" /></Card></Col>
          </Row>
          <Card size="small"><ActivityHeatmap data={portrait.activeHours} /></Card>
        </>
      ) : null}
    </div>
  );
}
