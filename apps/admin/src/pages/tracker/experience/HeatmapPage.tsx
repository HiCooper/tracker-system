import { useEffect, useState, useRef } from 'react';
import {
  Card, Row, Col, DatePicker, Typography, Breadcrumb, Button, Select, Statistic, Space, Spin, Segmented,
} from 'antd';
import { HomeOutlined, PlayCircleOutlined, EyeOutlined, AimOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { useExperienceStore } from '../../../stores/experienceStore';
import { useSetupStore } from '../../../stores/setupStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ============ Canvas Heatmap Renderer ============

interface HeatPoint { x: number; y: number; count: number; }

function renderHeatmap(
  ctx: CanvasRenderingContext2D,
  points: HeatPoint[],
  width: number,
  height: number,
  maxCount: number,
) {
  ctx.clearRect(0, 0, width, height);
  if (points.length === 0) return;

  for (const p of points) {
    const intensity = Math.min(p.count / maxCount, 1);
    const radius = 20 + intensity * 40;
    const alpha = 0.15 + intensity * 0.7;

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    const r = Math.floor(intensity * 255);
    const g = Math.floor((1 - intensity) * 200);
    const b = Math.floor((1 - intensity) * 255);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.6})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
  }
}

// ============ Mock Page Preview ============

function MockPagePreview({ width, height }: { width: number; height: number }) {
  const scale = Math.min(1, 1200 / width);
  const w = Math.floor(width * scale);
  const h = Math.floor(height * scale);

  return (
    <div style={{
      width: w, height: Math.min(h, 600), overflow: 'hidden',
      border: '1px solid #d9d9d9', borderRadius: 4, background: '#fafafa',
      position: 'relative', margin: '0 auto',
    }}>
      {/* Nav bar */}
      <div style={{ height: 44, background: '#1677ff', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {['首页', '产品', '关于', '联系'].map((t) => (
            <span key={t} style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{t}</span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ background: '#fff', color: '#1677ff', padding: '2px 12px', borderRadius: 4, fontSize: 12 }}>登录</span>
        </div>
      </div>
      {/* Hero */}
      <div style={{ height: 160, background: 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1677ff' }}>欢迎来到 GateFlow</div>
        <div style={{ fontSize: 14, color: '#666', marginTop: 8 }}>下一代埋点分析平台</div>
        <div style={{ marginTop: 12, background: '#1677ff', color: '#fff', padding: '6px 24px', borderRadius: 6, fontSize: 13 }}>立即开始</div>
      </div>
      {/* Cards */}
      <div style={{ padding: 16, display: 'flex', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: 80, background: '#fff', border: '1px solid #f0f0f0', borderRadius: 6, padding: 12 }}>
            <div style={{ width: '60%', height: 12, background: '#f0f0f0', borderRadius: 3 }} />
            <div style={{ width: '80%', height: 8, background: '#f5f5f5', borderRadius: 3, marginTop: 8 }} />
            <div style={{ width: '40%', height: 8, background: '#f5f5f5', borderRadius: 3, marginTop: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Main Page ============

export function HeatmapPage() {
  const { appCode } = useParams<{ appCode: string }>();
  const { apps, fetchApps } = useSetupStore();
  const { heatmapData, heatmapLoading, pages, pagesLoading, fetchHeatmap, fetchPages } = useExperienceStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPage, setSelectedPage] = useState('');
  const [heatmapType, setHeatmapType] = useState<'click' | 'exposure' | 'scroll'>('click');
  const [timeRange, setTimeRange] = useState<[string, string]>([
    dayjs().subtract(7, 'd').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);
  const [showOverlay, setShowOverlay] = useState(true);
  const [analyzed, setAnalyzed] = useState(false);

  useEffect(() => { fetchApps(); }, []);

  const appName = apps.find((a) => a.appCode === appCode)?.appName || appCode;

  useEffect(() => {
    if (appCode && timeRange[0] && timeRange[1]) {
      fetchPages({ appCode, startTime: timeRange[0], endTime: timeRange[1] });
    }
  }, [appCode]);

  // Render heatmap on canvas when data changes
  useEffect(() => {
    if (!heatmapData || !canvasRef.current || !showOverlay) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const maxCount = Math.max(...heatmapData.points.map((p) => p.count), 1);
    renderHeatmap(ctx, heatmapData.points, canvas.width, canvas.height, maxCount);
  }, [heatmapData, showOverlay]);

  const handleAnalyze = async () => {
    if (!appCode || !selectedPage) return;
    await fetchHeatmap({
      appCode,
      pageUrl: selectedPage,
      startTime: timeRange[0],
      endTime: timeRange[1],
      type: heatmapType,
    });
    setAnalyzed(true);
  };

  const pageOptions = pages.map((p) => ({
    label: `${p.pageTitle || p.pageUrl} (${p.pageViews.toLocaleString()} PV)`,
    value: p.pageUrl,
  }));

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/advanced"><HomeOutlined /> 高级分析</Link> },
        { title: appName || '' },
        { title: '热力图' },
      ]} />

      <Title level={4} style={{ marginBottom: 16 }}>页面热力图</Title>

      {/* Configuration */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>页面:</span>
            <Select
              value={selectedPage || undefined}
              style={{ width: 300 }}
              onChange={setSelectedPage}
              placeholder="选择要分析的页面"
              loading={pagesLoading}
              options={pageOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>类型:</span>
            <Segmented
              value={heatmapType}
              onChange={(v) => setHeatmapType(v as 'click' | 'exposure' | 'scroll')}
              options={[
                { label: '点击', value: 'click', icon: <AimOutlined /> },
                { label: '曝光', value: 'exposure', icon: <EyeOutlined /> },
              ]}
            />
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>时间:</span>
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
          </Space>
        </Space>
        <div style={{ marginTop: 12 }}>
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleAnalyze} loading={heatmapLoading}>
            分析
          </Button>
        </div>
      </Card>

      {!analyzed && !heatmapLoading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
          <EyeOutlined style={{ fontSize: 48, marginBottom: 16, display: 'block' }} />
          选择页面并点击"分析"查看用户交互热力图
        </div>
      ) : heatmapLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : heatmapData ? (
        <>
          {/* Stats bar */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Card size="small"><Statistic title="总交互次数" value={heatmapData.totalClicks} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="热力点数" value={heatmapData.points.length} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="视口宽度" value={heatmapData.viewportWidth} suffix="px" /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="分析页面" value={heatmapData.pageUrl} valueStyle={{ fontSize: 14 }} /></Card></Col>
          </Row>

          {/* Heatmap display */}
          <Card
            size="small"
            title={
              <Space>
                <span>热力图 — {heatmapType === 'click' ? '点击' : '曝光'}分布</span>
                <Segmented
                  size="small"
                  value={showOverlay ? 'overlay' : 'data'}
                  onChange={(v) => setShowOverlay(v === 'overlay')}
                  options={[{ label: '热力叠加', value: 'overlay' }, { label: '纯数据', value: 'data' }]}
                />
              </Space>
            }
          >
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {showOverlay && <MockPagePreview width={heatmapData.viewportWidth} height={heatmapData.viewportHeight} />}
              <canvas
                ref={canvasRef}
                width={Math.min(heatmapData.viewportWidth, 1200)}
                height={Math.min(heatmapData.viewportHeight, 600)}
                style={{
                  position: showOverlay ? 'absolute' : 'relative',
                  top: 0, left: 0,
                  border: showOverlay ? 'none' : '1px solid #d9d9d9',
                  borderRadius: 4,
                  background: showOverlay ? 'transparent' : '#fafafa',
                  pointerEvents: 'none',
                }}
              />
            </div>
            {/* Legend */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#999' }}>
              <span>低</span>
              <div style={{
                width: 200, height: 12, borderRadius: 6,
                background: 'linear-gradient(to right, #00f, #0ff, #0f0, #ff0, #f00)',
              }} />
              <span>高</span>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
