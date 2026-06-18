import { useEffect } from 'react';
import { Card, Row, Col, Typography, Breadcrumb, Spin, Statistic } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useSetupStore } from '../../../stores/setupStore';
import dayjs from 'dayjs';

const { Title } = Typography;

export function AdvancedAppPage() {
  const { apps, loading, fetchApps } = useSetupStore();
  const navigate = useNavigate();

  useEffect(() => { fetchApps(); }, []);

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/advanced"><HomeOutlined /> 高级分析</Link> },
      ]} />

      <Title level={4} style={{ marginBottom: 16 }}>选择应用进行高级分析</Title>

      {loading ? <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div> : (
        <Row gutter={[16, 16]}>
          {apps.map((a) => (
            <Col key={a.id} xs={24} sm={12} md={8}>
              <Card hoverable onClick={() => navigate(`/tracker/advanced/${a.appCode}/funnel`)}>
                <Title level={5}>{a.appName}</Title>
                <code style={{ color: '#999', fontSize: 12 }}>{a.appCode}</code>
                <Row gutter={16} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <div style={{ fontSize: 12, color: '#666' }}>页面数</div>
                    <Statistic value={a.pageCount} valueStyle={{ fontSize: 20 }} />
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: 12, color: '#666' }}>创建时间</div>
                    <Statistic value={dayjs(a.createdAt).format('YYYY-MM-DD')} valueStyle={{ fontSize: 14 }} />
                  </Col>
                </Row>
                <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
                  支持漏斗分析 · 留存分析 · 路径分析
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
