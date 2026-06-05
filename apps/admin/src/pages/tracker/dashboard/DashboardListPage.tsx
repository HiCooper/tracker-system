import { useEffect } from 'react';
import {
  Typography, Card, Row, Col, Button, Tag, Popconfirm, message, Spin, Empty,
} from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, DashboardOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../../../stores/dashboardStore';
import dayjs from 'dayjs';

const { Title } = Typography;

export function DashboardListPage() {
  const { dashboards, loading, fetchList, remove } = useDashboardStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDelete = async (id: number) => {
    try {
      await remove(id);
      message.success('删除成功');
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>可视化看板</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tracker/dashboards/new')}>
          新建看板
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : dashboards.length === 0 ? (
        <Empty description="暂无看板" style={{ padding: 80 }} />
      ) : (
        <Row gutter={[16, 16]}>
          {dashboards.map((d) => (
            <Col key={d.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                actions={[
                  <EyeOutlined key="view" onClick={() => navigate(`/tracker/dashboards/${d.id}`)} />,
                  <DeleteOutlined key="delete" onClick={() => handleDelete(d.id)} />,
                ]}
              >
                <Card.Meta
                  avatar={<DashboardOutlined style={{ fontSize: 24, color: '#1677ff' }} />}
                  title={d.name}
                  description={
                    <>
                      <Tag color={d.config.type === 'system' ? 'blue' : 'green'}>
                        {d.config.type === 'system' ? '系统预置' : '自定义'}
                      </Tag>
                      <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                        {d.config?.charts?.length || 0} 个图表 · {dayjs(d.createdAt).format('YYYY-MM-DD')}
                      </div>
                    </>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
