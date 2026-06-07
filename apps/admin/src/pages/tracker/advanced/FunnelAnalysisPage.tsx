import { useEffect, useState } from 'react';
import { Card, Row, Col, DatePicker, Typography, Breadcrumb, Table, Button, Input, Select, InputNumber, Statistic, Space, Divider, message, Spin } from 'antd';
import { HomeOutlined, PlusOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { useAdvancedAnalysisStore } from '../../../stores/advancedAnalysisStore';
import { FunnelChart } from '../../../components/charts/FunnelChart';
import { FunnelTrendChart } from '../../../components/charts/FunnelTrendChart';
import type { FunnelStep, FunnelStepDef } from '../../../types/advancedAnalysis';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const EVENT_TYPES = ['page_view', 'click', 'exposure', 'scroll', 'custom'];

function fmt(v: number) { return v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v?.toLocaleString(); }

export function FunnelAnalysisPage() {
  const { funnelSteps, funnelTrend, funnelOverallRate, funnelTotalEntrants, loading, timeRange, setTimeRange, fetchFunnel } =
    useAdvancedAnalysisStore();

  const [steps, setSteps] = useState<FunnelStepDef[]>([
    { stepName: '浏览首页', eventType: 'page_view', eventFilter: '' },
    { stepName: '查看商品', eventType: 'page_view', eventFilter: '' },
    { stepName: '加入购物车', eventType: 'click', eventFilter: '' },
    { stepName: '提交订单', eventType: 'page_view', eventFilter: '' },
    { stepName: '支付成功', eventType: 'page_view', eventFilter: '' },
  ]);
  const [conversionWindow, setConversionWindow] = useState(30);
  const [platform, setPlatform] = useState('');
  const [analyzed, setAnalyzed] = useState(false);

  const handleAddStep = () => {
    setSteps([...steps, { stepName: `步骤 ${steps.length + 1}`, eventType: 'click', eventFilter: '' }]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 2) { message.warning('至少保留2个步骤'); return; }
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: keyof FunnelStepDef, value: string) => {
    const next = [...steps];
    next[index] = { ...next[index], [field]: value };
    setSteps(next);
  };

  const handleAnalyze = async () => {
    const valid = steps.every((s) => s.stepName && s.eventType);
    if (!valid) { message.warning('请完善所有步骤的配置'); return; }
    await fetchFunnel({ steps, conversionWindowMinutes: conversionWindow, platform: platform || undefined });
    setAnalyzed(true);
  };

  useEffect(() => {
    if (analyzed) handleAnalyze();
  }, [timeRange]);

  const columns: ColumnsType<FunnelStep> = [
    { title: '#', dataIndex: 'stepIndex', key: 'stepIndex', width: 50, render: (v: number) => v + 1 },
    { title: '步骤名称', dataIndex: 'stepName', key: 'stepName', width: 140 },
    { title: '事件类型', dataIndex: 'eventType', key: 'eventType', width: 110, render: (v: string) => <code>{v}</code> },
    { title: '人数', dataIndex: 'count', key: 'count', width: 110, render: (v: number) => fmt(v) },
    { title: '用户数', dataIndex: 'users', key: 'users', width: 110, render: (v: number) => fmt(v) },
    { title: '整体转化率', dataIndex: 'conversionRate', key: 'conv', width: 110, render: (v: number) => `${(v * 100).toFixed(1)}%` },
    { title: '步骤转化率', dataIndex: 'stepConversionRate', key: 'sconv', width: 110, render: (v: number) => `${(v * 100).toFixed(1)}%` },
    { title: '中位耗时', dataIndex: 'medianDurationSec', key: 'dur', width: 110, render: (v: number) => v > 0 ? `${v}s` : '—' },
  ];

  const stepInfo = funnelSteps.map((s) => ({ stepIndex: s.stepIndex, stepName: s.stepName }));

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/advanced/funnel"><HomeOutlined /> 漏斗分析</Link> },
      ]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>漏斗分析</Title>
        <RangePicker
          value={[dayjs(timeRange.startTime), dayjs(timeRange.endTime)]}
          onChange={(d) => { if (d?.[0] && d?.[1]) setTimeRange({ startTime: d[0].format('YYYY-MM-DD'), endTime: d[1].format('YYYY-MM-DD') }); }}
          presets={[{ label: '过去7天', value: [dayjs().subtract(6, 'd'), dayjs()] }, { label: '过去30天', value: [dayjs().subtract(29, 'd'), dayjs()] }]}
        />
      </div>

      {/* Configuration Panel */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }}>
          {steps.map((step, i) => (
            <Space key={i} align="start" style={{ marginBottom: 8 }}>
              <span style={{ lineHeight: '32px', fontSize: 12, color: '#999' }}>步骤{i + 1}</span>
              <Input
                placeholder="名称" value={step.stepName} style={{ width: 110 }}
                onChange={(e) => handleStepChange(i, 'stepName', e.target.value)}
              />
              <Select
                value={step.eventType} style={{ width: 110 }}
                onChange={(v) => handleStepChange(i, 'eventType', v)}
                options={EVENT_TYPES.map((t) => ({ label: t, value: t }))}
              />
              <Input
                placeholder="筛选(可选)" value={step.eventFilter} style={{ width: 140 }}
                onChange={(e) => handleStepChange(i, 'eventFilter', e.target.value)}
              />
              {steps.length > 2 && (
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveStep(i)} />
              )}
            </Space>
          ))}
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddStep}>添加步骤</Button>
        </div>
        <Divider style={{ margin: '12px 0' }} />
        <Space>
          <span style={{ fontSize: 12, color: '#666' }}>转化窗口:</span>
          <Select value={conversionWindow} style={{ width: 100 }} onChange={setConversionWindow}
            options={[{ label: '5分钟', value: 5 }, { label: '15分钟', value: 15 }, { label: '30分钟', value: 30 }, { label: '60分钟', value: 60 }]}
          />
          <span style={{ fontSize: 12, color: '#666' }}>平台:</span>
          <Select value={platform} style={{ width: 100 }} onChange={setPlatform} allowClear placeholder="全部"
            options={[{ label: 'Web', value: 'web' }, { label: 'Mobile', value: 'mobile' }, { label: 'Desktop', value: 'desktop' }]}
          />
          <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleAnalyze} loading={loading}>分析</Button>
        </Space>
      </Card>

      {!analyzed && !loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>配置步骤并点击"分析"查看漏斗数据</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* Summary */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Card size="small"><Statistic title="总进入人数" value={fmt(funnelTotalEntrants)} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="整体转化率" value={`${(funnelOverallRate * 100).toFixed(1)}%`} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="最终人数" value={fmt(funnelSteps[funnelSteps.length - 1]?.count || 0)} /></Card></Col>
            <Col span={6}><Card size="small"><Statistic title="步骤数" value={funnelSteps.length} /></Card></Col>
          </Row>

          {/* Funnel Chart */}
          <Card style={{ marginBottom: 16 }}>
            <FunnelChart data={funnelSteps} loading={loading} height={400} />
          </Card>

          {/* Trend Chart */}
          {funnelTrend.length > 0 && (
            <Card style={{ marginBottom: 16 }} title="转化趋势">
              <FunnelTrendChart data={funnelTrend} steps={stepInfo} loading={loading} height={320} />
            </Card>
          )}

          {/* Detail Table */}
          <Table bordered columns={columns} dataSource={funnelSteps} rowKey="stepIndex" loading={loading} pagination={false} />
        </>
      )}
    </div>
  );
}
