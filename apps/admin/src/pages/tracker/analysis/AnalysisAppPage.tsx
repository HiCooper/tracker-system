import { useEffect } from 'react';
import { Card, Row, Col, DatePicker, Typography, Spin, Statistic } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAnalysisStore } from '../../../stores/analysisStore';
import { EmptyState } from '../../../components/EmptyState';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export function AnalysisAppPage() {
  const { appMetrics, loading, timeRange, setTimeRange, fetchAppMetrics } = useAnalysisStore();
  const navigate = useNavigate();

  useEffect(() => { fetchAppMetrics(); }, [timeRange]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>流量分析</Title>
        <RangePicker
          value={[dayjs(timeRange.startTime), dayjs(timeRange.endTime)]}
          onChange={(d) => { if (d?.[0] && d?.[1]) setTimeRange({ startTime: d[0].format('YYYY-MM-DD'), endTime: d[1].format('YYYY-MM-DD') }); }}
          presets={[
            { label: '过去7天', value: [dayjs().subtract(6, 'd'), dayjs()] },
            { label: '过去30天', value: [dayjs().subtract(29, 'd'), dayjs()] },
          ]}
        />
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> :
        appMetrics.length === 0 ? (
          <EmptyState
            description="暂无应用数据,请先在「埋点管理」创建应用并接入采集"
            actionText="去创建应用"
            onAction={() => navigate('/tracker/setup')}
          />
        ) : (
        <Row gutter={[16, 16]}>
          {appMetrics.map((a) => (
            <Col key={a.appCode} xs={24} sm={12} md={8}>
              <Card hoverable onClick={() => navigate(`/tracker/analysis/${a.appCode}`)}>
                <Title level={5}>{a.appName}</Title>
                <code style={{ color: '#999', fontSize: 12 }}>{a.appCode}</code>
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={8}><Statistic title="DAU" value={a.dau} formatter={(v) => (v as number >= 10000 ? `${((v as number) / 10000).toFixed(1)}万` : v)} /></Col>
                  <Col span={8}><Statistic title="PV" value={a.totalPv} formatter={(v) => (v as number >= 10000 ? `${((v as number) / 10000).toFixed(1)}万` : v)} /></Col>
                  <Col span={8}><Statistic title="页面数" value={a.pageCount} /></Col>
                </Row>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
