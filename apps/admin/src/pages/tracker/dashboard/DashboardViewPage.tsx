import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Button, Card, Spin, Space } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { useDashboardStore } from '../../../stores/dashboardStore';
import { TrendChart } from '../../../components/charts/TrendChart';
import { MetricCard } from '../../../components/charts/MetricCard';
import { generateMockAnalysis } from '../../../mocks/analysis';
import type { ChartWidget } from '../../../types/dashboard';

const { Title } = Typography;

function renderWidget(widget: ChartWidget) {
  const mockData = generateMockAnalysis();

  switch (widget.type) {
    case 'line':
    case 'bar':
      return (
        <TrendChart
          series={mockData.series}
          chartType={widget.type}
          height={300}
        />
      );
    case 'pie':
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, color: '#1677ff', fontWeight: 700 }}>
              {Math.round(60 + Math.random() * 30)}%
            </div>
            <div style={{ color: '#999', marginTop: 8 }}>新用户占比</div>
          </div>
        </div>
      );
    case 'metric':
      return (
        <MetricCard
          title={widget.title}
          value={(Math.round(Math.random() * 10000)).toLocaleString()}
        />
      );
    case 'table':
      return (
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>排名</th>
              <th style={{ textAlign: 'left', padding: 8 }}>页面</th>
              <th style={{ textAlign: 'right', padding: 8 }}>浏览量</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }, (_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                <td style={{ padding: 8 }}>{i + 1}</td>
                <td style={{ padding: 8 }}>页面 {['首页', '商品详情', '搜索结果', '购物车', '个人中心'][i]}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{(Math.round(50000 - i * 8000)).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    default:
      return <div>未知图表类型</div>;
  }
}

export function DashboardViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentDashboard, loading, fetchById } = useDashboardStore();

  useEffect(() => {
    if (id) {
      fetchById(Number(id));
    }
  }, [id, fetchById]);

  if (loading || !currentDashboard) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tracker/dashboards')}>返回</Button>
          <Title level={4} style={{ margin: 0 }}>{currentDashboard.name}</Title>
        </Space>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 16,
      }}>
        {currentDashboard.config.charts.map((widget) => (
          <Card
            key={widget.id}
            title={widget.title}
            size="small"
            style={{
              gridColumn: `span ${widget.position?.w || 6}`,
              gridRow: `span ${Math.ceil((widget.position?.h || 4) / 2)}`,
            }}
          >
            {renderWidget(widget)}
          </Card>
        ))}
      </div>
    </div>
  );
}
