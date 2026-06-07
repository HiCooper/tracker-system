import { useEffect, useState } from 'react';
import { Card, Row, Col, DatePicker, Typography, Breadcrumb, Table, Button, Input, Select, Slider, Statistic, Space, Divider, Tag, Spin } from 'antd';
import { HomeOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useAdvancedAnalysisStore } from '../../../stores/advancedAnalysisStore';
import { PathSankeyChart } from '../../../components/charts/PathSankeyChart';
import type { TopPath } from '../../../types/advancedAnalysis';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#f5222d', '#faad14'];

export function PathAnalysisPage() {
  const { pathNodes, pathTransitions, pathTopPaths, pathSummary, loading, timeRange, setTimeRange, fetchPath } =
    useAdvancedAnalysisStore();

  const [startPage, setStartPage] = useState('');
  const [depth, setDepth] = useState(5);
  const [minTransitionCount, setMinTransitionCount] = useState(50);
  const [platform, setPlatform] = useState('');
  const [analyzed, setAnalyzed] = useState(false);

  const handleAnalyze = async () => {
    await fetchPath({
      startPage: startPage || undefined,
      depth,
      platform: platform || undefined,
      minTransitionCount,
    });
    setAnalyzed(true);
  };

  useEffect(() => {
    if (analyzed) handleAnalyze();
  }, [timeRange]);

  const topPathColumns: ColumnsType<TopPath> = [
    {
      title: '路径序列', dataIndex: 'path', key: 'path',
      render: (path: string[]) => (
        <Space size={4} wrap>
          {path.map((p, i) => (
            <span key={i}>
              <Tag color={COLORS[i % COLORS.length]} style={{ margin: 1 }}>{p}</Tag>
              {i < path.length - 1 && <span style={{ color: '#bbb' }}>→</span>}
            </span>
          ))}
        </Space>
      ),
    },
    { title: '次数', dataIndex: 'count', key: 'count', width: 100, render: (v: number) => v.toLocaleString() },
    { title: '用户数', dataIndex: 'users', key: 'users', width: 100, render: (v: number) => v.toLocaleString() },
    { title: '占比', dataIndex: 'rate', key: 'rate', width: 80, render: (v: number) => `${(v * 100).toFixed(1)}%` },
  ];

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/advanced/path"><HomeOutlined /> 路径分析</Link> },
      ]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>用户路径分析</Title>
        <RangePicker
          value={[dayjs(timeRange.startTime), dayjs(timeRange.endTime)]}
          onChange={(d) => { if (d?.[0] && d?.[1]) setTimeRange({ startTime: d[0].format('YYYY-MM-DD'), endTime: d[1].format('YYYY-MM-DD') }); }}
          presets={[{ label: '过去7天', value: [dayjs().subtract(6, 'd'), dayjs()] }, { label: '过去30天', value: [dayjs().subtract(29, 'd'), dayjs()] }]}
        />
      </div>

      {/* Configuration Panel */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>起始页面:</span>
            <Input value={startPage} style={{ width: 160 }} onChange={(e) => setStartPage(e.target.value)} placeholder="可选，留空查看全局" allowClear />
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>路径深度:</span>
            <Slider value={depth} style={{ width: 140 }} min={2} max={8} onChange={setDepth} />
            <span style={{ fontSize: 12, color: '#999', width: 20 }}>{depth}</span>
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>最小转化数:</span>
            <Input value={String(minTransitionCount)} style={{ width: 100 }} onChange={(e) => { const v = Number(e.target.value); if (v >= 10) setMinTransitionCount(v); }} />
          </Space>
          <Space>
            <span style={{ fontSize: 12, color: '#666' }}>平台:</span>
            <Select value={platform} style={{ width: 100 }} onChange={setPlatform} allowClear placeholder="全部"
              options={[{ label: 'Web', value: 'web' }, { label: 'Mobile', value: 'mobile' }]}
            />
          </Space>
        </Space>
        <Divider style={{ margin: '12px 0' }} />
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleAnalyze} loading={loading}>分析</Button>
      </Card>

      {!analyzed && !loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>配置参数并点击"分析"查看用户路径</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* Summary */}
          {pathSummary && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Card size="small"><Statistic title="总 Session 数" value={pathSummary.totalSessions.toLocaleString()} /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="平均路径深度" value={pathSummary.avgPathDepth} suffix="页" /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="去重页面数" value={pathNodes.length} /></Card></Col>
            </Row>
          )}

          {/* Sankey Diagram */}
          <Card style={{ marginBottom: 16 }}>
            <PathSankeyChart nodes={pathNodes} transitions={pathTransitions} loading={loading} height={500} />
          </Card>

          {/* Top Paths Table */}
          <Card title="热门路径 TOP 20" size="small">
            <Table
              bordered
              columns={topPathColumns}
              dataSource={pathTopPaths}
              rowKey={(r) => r.path.join('->')}
              loading={loading}
              pagination={false}
              size="small"
            />
          </Card>
        </>
      )}
    </div>
  );
}
