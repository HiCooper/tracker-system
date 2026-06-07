import { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Breadcrumb, Input, List, Tag, Spin, Empty } from 'antd';
import { HomeOutlined, SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useLineageStore } from '../../../stores/lineageStore';
import type { EventLineage, LineageRef } from '../../../types/lineage';

const { Title, Text } = Typography;

const REF_TYPE_LABELS: Record<string, string> = {
  dashboard: '看板', funnel: '漏斗分析', retention: '留存分析', path: '路径分析', segment: '用户分群',
};

const NODE_COLORS: Record<string, string> = {
  event: '#1677ff', property: '#52c41a', dashboard: '#fa8c16',
  funnel: '#eb2f96', retention: '#722ed1', path: '#13c2c2',
};

export function LineagePage() {
  const { events, currentLineage, currentGraph, loading, fetchEvents, selectEvent } = useLineageStore();
  const [search, setSearch] = useState('');

  useEffect(() => { fetchEvents(); }, []);

  const filtered = events.filter((e) =>
    !search || e.eventKey.includes(search) || e.eventName.includes(search)
  );

  const graphOption = currentGraph ? {
    tooltip: {
      formatter: (p: { data: { name: string; type?: string } }) =>
        `${p.data.name}${p.data.type ? `<br/>类型: ${p.data.type}` : ''}`,
    },
    series: [{
      type: 'graph', layout: 'force', roam: true, draggable: true,
      force: { repulsion: 300, edgeLength: [100, 250] },
      data: currentGraph.nodes.map((n) => ({
        name: n.name, symbolSize: n.symbolSize || 30,
        itemStyle: { color: NODE_COLORS[n.type] || '#999' },
      })),
      edges: currentGraph.edges.map((e) => ({
        source: e.source, target: e.target,
        label: { show: true, formatter: e.label, fontSize: 10 },
      })),
      label: { show: true, fontSize: 11 },
      lineStyle: { color: '#bbb', curveness: 0.2 },
    }],
  } : null;

  return (
    <div>
      <Breadcrumb style={{ marginBottom: 16 }} items={[
        { title: <Link to="/tracker/engineering/lineage"><HomeOutlined /> 血缘追踪</Link> },
      ]} />
      <Title level={4} style={{ marginBottom: 16 }}>埋点血缘追踪</Title>

      <Row gutter={16}>
        <Col span={6}>
          <Card size="small" title="事件列表" extra={
            <Input prefix={<SearchOutlined />} size="small" placeholder="搜索" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 120 }} />
          }>
            {loading ? <Spin /> : (
              <List size="small" dataSource={filtered} style={{ maxHeight: 560, overflow: 'auto' }}
                renderItem={(e: EventLineage) => (
                  <List.Item onClick={() => selectEvent(e.eventKey)}
                    style={{ cursor: 'pointer', padding: '8px 12px',
                      background: currentLineage?.eventKey === e.eventKey ? '#e6f4ff' : undefined, borderRadius: 4, marginBottom: 2 }}>
                    <List.Item.Meta
                      title={<Text strong style={{ fontSize: 13 }}>{e.eventName}</Text>}
                      description={<Text type="secondary" style={{ fontSize: 11 }}>{e.eventKey}</Text>}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col span={18}>
          {!currentLineage ? (
            <Card size="small"><Empty description="选择左侧事件查看血缘关系" style={{ padding: 60 }} /></Card>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: 120 }}><Spin size="large" /></div>
          ) : (
            <>
              <Card size="small" title={`${currentLineage.eventName} — 引用关系`} style={{ marginBottom: 16 }}>
                {currentLineage.references.length === 0 ? (
                  <Text type="secondary">未被任何资源引用，可安全删除</Text>
                ) : (
                  currentLineage.references.map((ref: LineageRef, i: number) => (
                    <Tag key={i} color="blue" style={{ marginBottom: 4 }}>
                      {REF_TYPE_LABELS[ref.refType] || ref.refType}: {ref.refName}
                    </Tag>
                  ))
                )}
                {currentLineage.properties.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>关联属性: </Text>
                    {currentLineage.properties.map((p) => (
                      <Tag key={p.propKey} color="green">{p.propName} ({p.dataType})</Tag>
                    ))}
                  </div>
                )}
              </Card>

              <Card size="small" title="血缘关系图">
                {graphOption ? (
                  <ReactECharts option={graphOption} style={{ height: 420 }} notMerge />
                ) : (
                  <Empty description="无血缘数据" style={{ padding: 60 }} />
                )}
              </Card>
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}
