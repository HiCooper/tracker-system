import { useEffect } from 'react';
import {
  Typography, Space, Select, DatePicker, Button, Radio, Table, Card,
} from 'antd';
import { BarChartOutlined, LineChartOutlined, SearchOutlined } from '@ant-design/icons';
import { useAnalysisStore } from '../../../stores/analysisStore';
import { TrendChart } from '../../../components/charts/TrendChart';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const eventTypeOptions = [
  { label: '页面浏览', value: 'page_view' },
  { label: '点击事件', value: 'click' },
  { label: '曝光事件', value: 'exposure' },
  { label: '自定义', value: 'custom' },
];

export function EventAnalysisPage() {
  const {
    queryParams, result, loading,
    chartType, setChartType,
    setQueryParams, execute,
  } = useAnalysisStore();

  useEffect(() => {
    // Set default time range (last 30 days)
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

  const handleSearch = () => {
    execute();
  };

  const tableColumns: ColumnsType<Record<string, unknown>> = [
    { title: '日期', dataIndex: 'time', key: 'time', width: 120 },
    { title: '页面浏览', dataIndex: 'page_view', key: 'page_view', width: 140, render: (v: number) => v?.toLocaleString() },
    { title: '点击事件', dataIndex: 'click', key: 'click', width: 140, render: (v: number) => v?.toLocaleString() },
    { title: '曝光事件', dataIndex: 'exposure', key: 'exposure', width: 140, render: (v: number) => v?.toLocaleString() },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>事件分析</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle" style={{ width: '100%' }}>
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
              { label: '今天', value: [dayjs(), dayjs()] },
              { label: '昨天', value: [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')] },
              { label: '过去7天', value: [dayjs().subtract(6, 'day'), dayjs()] },
              { label: '过去30天', value: [dayjs().subtract(29, 'day'), dayjs()] },
            ]}
          />
          <span>事件类型：</span>
          <Select
            mode="multiple"
            placeholder="全部事件"
            style={{ minWidth: 200 }}
            value={queryParams.eventTypes}
            onChange={(v) => setQueryParams({ eventTypes: v })}
            options={eventTypeOptions}
            allowClear
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
        </Space>
      </Card>

      <Card
        title="事件趋势"
        extra={
          <Radio.Group value={chartType} onChange={(e) => setChartType(e.target.value)}>
            <Radio.Button value="line"><LineChartOutlined /> 折线图</Radio.Button>
            <Radio.Button value="bar"><BarChartOutlined /> 柱状图</Radio.Button>
          </Radio.Group>
        }
        style={{ marginBottom: 16 }}
      >
        <TrendChart
          series={result?.series || []}
          loading={loading}
          chartType={chartType}
          height={400}
        />
      </Card>

      <Card title="明细数据">
        <Table
          columns={tableColumns}
          dataSource={result?.tableData || []}
          rowKey="time"
          loading={loading}
          size="small"
          scroll={{ x: 600 }}
          pagination={{ pageSize: 30, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>
    </div>
  );
}
