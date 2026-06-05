import { useEffect } from 'react';
import { Typography, DatePicker, Button, Card, Row, Col, Table, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useSessionStore } from '../../../stores/sessionStore';
import { TrendChart } from '../../../components/charts/TrendChart';
import { MetricCard } from '../../../components/charts/MetricCard';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export function SessionAnalysisPage() {
  const { queryParams, result, loading, setQueryParams, execute } = useSessionStore();

  useEffect(() => {
    if (!queryParams.startTime) {
      const end = dayjs().format('YYYY-MM-DD');
      const start = dayjs().subtract(29, 'day').format('YYYY-MM-DD');
      setQueryParams({ startTime: start, endTime: end });
    }
  }, []);

  useEffect(() => {
    if (queryParams.startTime && queryParams.endTime) {
      execute();
    }
  }, [queryParams.startTime, queryParams.endTime]);

  const summary = result?.summary;

  const trendData = result?.series.map((s) => ({
    name: s.name,
    eventType: 'session',
    data: s.data,
  })) || [];

  const tableColumns: ColumnsType<Record<string, unknown>> = [
    { title: '日期', dataIndex: 'time', key: 'time', width: 120 },
    { title: '会话数', dataIndex: 'value', key: 'value', width: 140, render: (v: number) => v?.toLocaleString() },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Session分析</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>时间范围：</span>
          <RangePicker
            value={
              queryParams.startTime
                ? [dayjs(queryParams.startTime), dayjs(queryParams.endTime)]
                : undefined
            }
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setQueryParams({
                  startTime: dates[0].format('YYYY-MM-DD'),
                  endTime: dates[1].format('YYYY-MM-DD'),
                });
              }
            }}
            presets={[
              { label: '过去7天', value: [dayjs().subtract(6, 'day'), dayjs()] },
              { label: '过去30天', value: [dayjs().subtract(29, 'day'), dayjs()] },
            ]}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => execute()}>查询</Button>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <MetricCard title="会话次数" value={summary?.sessionCount?.toLocaleString() || '-'} loading={loading} color="#1677ff" />
        </Col>
        <Col xs={12} sm={6}>
          <MetricCard title="访问用户数" value={summary?.userCount?.toLocaleString() || '-'} loading={loading} color="#52c41a" />
        </Col>
        <Col xs={12} sm={6}>
          <MetricCard title="平均时长(秒)" value={summary?.avgDuration || '-'} precision={1} loading={loading} color="#fa8c16" />
        </Col>
        <Col xs={12} sm={6}>
          <MetricCard
            title="跳出率"
            value={summary ? `${(summary.bounceRate * 100).toFixed(1)}%` : '-'}
            loading={loading}
            color="#ff4d4f"
          />
        </Col>
      </Row>

      <Card title="会话趋势" style={{ marginBottom: 16 }}>
        <TrendChart series={trendData} loading={loading} chartType="line" height={350} />
      </Card>

      <Card title="明细数据">
        <Table
          columns={tableColumns}
          dataSource={result?.series?.[0]?.data || []}
          rowKey="time"
          loading={loading}
          size="small"
          pagination={{ pageSize: 30, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>
    </div>
  );
}
