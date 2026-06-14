import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, Row, Col, Typography, Breadcrumb, Input, List, Tag, Empty, Select, Space, Button, Statistic, Skeleton, Tooltip, Badge, Divider } from 'antd';
import {
  HomeOutlined, SearchOutlined, ReloadOutlined,
  NodeIndexOutlined, ApiOutlined, LinkOutlined,
  DashboardOutlined, EyeOutlined, EyeInvisibleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { useLineageStore } from '../../../stores/lineageStore';
import { useSetupStore } from '../../../stores/setupStore';
import type { EventLineage, LineageRef, LineageGraphNode } from '../../../types/lineage';

const { Title, Text, Paragraph } = Typography;

// --- Design Tokens (Data-Dense Dashboard) ---
const TOKENS = {
  primary: '#1E40AF',
  secondary: '#3B82F6',
  accent: '#D97706',
  success: '#16A34A',
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#DBEAFE',
  muted: '#64748B',
};

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  click: { label: '点击', color: '#3B82F6' },
  page_view: { label: '浏览', color: '#8B5CF6' },
  exposure: { label: '曝光', color: '#F59E0B' },
  custom: { label: '自定义', color: '#10B981' },
};

const REF_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  dashboard: { label: '看板', icon: <DashboardOutlined /> },
  funnel: { label: '漏斗', icon: <NodeIndexOutlined /> },
  retention: { label: '留存', icon: <NodeIndexOutlined /> },
  path: { label: '路径', icon: <NodeIndexOutlined /> },
  segment: { label: '分群', icon: <NodeIndexOutlined /> },
};

// Professional node color palette — more muted, data-viz appropriate
const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  event:    { fill: '#3B82F6', stroke: '#1D4ED8' },
  property: { fill: '#10B981', stroke: '#047857' },
  dashboard:{ fill: '#F59E0B', stroke: '#B45309' },
  funnel:   { fill: '#EC4899', stroke: '#BE185D' },
  retention:{ fill: '#8B5CF6', stroke: '#6D28D9' },
  path:     { fill: '#06B6D4', stroke: '#0E7490' },
};

const NODE_LABELS: Record<string, string> = {
  event: '埋点事件', property: '属性', dashboard: '看板/方案',
  funnel: '漏斗', retention: '留存', path: '路径',
};

export function LineagePage() {
  const { events, currentLineage, currentGraph, loading, error, fetchEvents, selectEvent } = useLineageStore();
  const { apps, fetchApps } = useSetupStore();
  const navigate = useNavigate();

  useEffect(() => { fetchApps(); fetchEvents(); }, []);

  const [search, setSearch] = useState('');
  const [appFilter, setAppFilter] = useState('');
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(['event', 'property', 'dashboard']));

  const filtered = events.filter((e) => {
    const matchSearch = !search || e.eventKey.includes(search) || e.eventName.includes(search);
    const matchApp = !appFilter || e.eventKey.startsWith(appFilter);
    return matchSearch && matchApp;
  });

  // Stats
  const stats = useMemo(() => ({
    total: events.length,
    withRefs: events.filter(e => e.references?.length > 0).length,
    orphaned: events.filter(e => !e.references?.length).length,
    totalProps: events.reduce((sum, e) => sum + (e.properties?.length || 0), 0),
  }), [events]);

  const toggleType = (type: string) => {
    const next = new Set(visibleTypes);
    if (next.has(type)) next.delete(type); else next.add(type);
    setVisibleTypes(next);
  };

  const onGraphClick = useCallback((params: any) => {
    if (!params?.data?.name) return;
    const id: string = params.data.name;
    if (id.startsWith('event:')) selectEvent(id.replace('event:', ''));
    else if (id.startsWith('plan:')) navigate(`/tracker/engineering/plans/${id.replace('plan:', '')}`);
    else if (id.startsWith('dashboard:')) navigate('/tracker/bi');
  }, [navigate, selectEvent]);

  // Professional graph config
  const graphOption = currentGraph ? {
    tooltip: {
      backgroundColor: '#fff',
      borderColor: TOKENS.border,
      borderWidth: 1,
      textStyle: { color: '#1E293B', fontSize: 13 },
      formatter: (p: any) => {
        if (!p?.data) return '';
        const t = NODE_LABELS[p.data.type || ''] || p.data.type || '';
        const c = NODE_COLORS[p.data.type || '']?.fill || '#999';
        return `<div style="font-weight:600;margin-bottom:4px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c};margin-right:6px"></span>
          ${p.data.displayName || p.data.name}
        </div><div style="font-size:12px;color:#64748B">类型: ${t}</div>`;
      },
    },
    animationDuration: 600,
    animationEasingUpdate: 'cubicOut',
    series: [{
      type: 'graph', layout: 'force', roam: true, draggable: true,
      force: { repulsion: 350, gravity: 0.08, edgeLength: [120, 280] },
      data: currentGraph.nodes
        .filter((n: LineageGraphNode) => visibleTypes.has(n.type))
        .map((n: LineageGraphNode) => {
          const c = NODE_COLORS[n.type] || { fill: '#94A3B8', stroke: '#64748B' };
          return {
            name: n.id,
            displayName: n.name,
            type: n.type,
            symbolSize: n.symbolSize || 28,
            itemStyle: {
              color: c.fill,
              borderColor: c.stroke,
              borderWidth: 2,
              shadowBlur: 8,
              shadowColor: 'rgba(0,0,0,0.08)',
            },
            label: { show: true, fontSize: 11, color: '#334155' },
          };
        }),
      edges: currentGraph.edges.map((e) => ({
        source: e.source, target: e.target,
        label: { show: true, formatter: e.label, fontSize: 10, color: '#94A3B8' },
        lineStyle: { color: '#CBD5E1', curveness: 0.25, width: 1.5 },
      })),
      label: { show: true, fontSize: 11, formatter: (p: any) => p.data.displayName, color: '#334155' },
      emphasis: {
        focus: 'adjacency',
        lineStyle: { width: 3 },
        itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.2)' },
      },
    }],
  } : null;

  const selectedIdx = currentLineage ? events.findIndex(e => e.eventKey === currentLineage.eventKey) : -1;

  // --- Render ---
  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 12 }} items={[
        { title: <Link to="/tracker/engineering/lineage"><HomeOutlined /> 血缘追踪</Link> },
        ...(currentLineage ? [{ title: currentLineage.eventName }] : []),
      ]} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#1E293B' }}>埋点血缘追踪</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            追踪埋点事件在下游资源（看板、漏斗、留存分析等）中的引用关系，评估变更影响范围
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchEvents} size="middle">刷新数据</Button>
      </div>

      {/* Summary Stats */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { title: '事件总数', value: stats.total, icon: <ApiOutlined />, color: TOKENS.primary },
          { title: '被引用', value: stats.withRefs, icon: <LinkOutlined />, color: TOKENS.success },
          { title: '孤立事件', value: stats.orphaned, icon: <EyeInvisibleOutlined />, color: TOKENS.muted },
          { title: '属性总数', value: stats.totalProps, icon: <NodeIndexOutlined />, color: TOKENS.accent },
        ].map((s, i) => (
          <Col span={6} key={i}>
            <Card size="small" style={{
              background: TOKENS.cardBg, border: `1px solid ${TOKENS.border}`,
              borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <Statistic
                title={<Text style={{ fontSize: 12, color: TOKENS.muted }}>{s.title}</Text>}
                value={s.value}
                valueStyle={{ fontSize: 22, fontWeight: 700, color: s.color }}
                prefix={s.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Error Banner */}
      {error && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', background: '#FEF2F2',
          border: '1px solid #FECACA', borderRadius: 8, color: '#991B1B',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span><InfoCircleOutlined style={{ marginRight: 8 }} />{error}</span>
          <Button size="small" danger type="primary" ghost onClick={fetchEvents}>重试</Button>
        </div>
      )}

      {/* Main Content */}
      <Row gutter={16}>
        {/* Left: Event List */}
        <Col span={7}>
          <Card
            size="small"
            title={<span style={{ fontWeight: 600, fontSize: 14 }}>事件列表</span>}
            extra={
              <Space size={2}>
                <Select allowClear size="small" placeholder="应用" style={{ width: 72 }}
                  value={appFilter || undefined} onChange={(v) => setAppFilter(v || '')}
                  options={apps.map(a => ({ label: a.appCode, value: a.appCode }))} />
                <Input prefix={<SearchOutlined />} size="small" placeholder="搜索" value={search}
                  onChange={(e) => setSearch(e.target.value)} style={{ width: 90 }} />
              </Space>
            }
            bodyStyle={{ padding: 0 }}
            style={{ borderRadius: 8, border: `1px solid ${TOKENS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            {loading && events.length === 0 ? (
              <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 6 }} /></div>
            ) : filtered.length === 0 ? (
              <Empty description="无匹配事件" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} />
            ) : (
              <List
                size="small"
                dataSource={filtered}
                style={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}
                renderItem={(e: EventLineage) => {
                  const isActive = currentLineage?.eventKey === e.eventKey;
                  const cat = CATEGORY_META[e.category] || { label: e.category, color: '#94A3B8' };
                  return (
                    <List.Item
                      onClick={() => selectEvent(e.eventKey)}
                      style={{
                        cursor: 'pointer', padding: '10px 14px', transition: 'all 0.15s',
                        background: isActive ? '#EFF6FF' : undefined,
                        borderLeft: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                        borderBottom: '1px solid #F1F5F9',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = isActive ? '#EFF6FF' : '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = isActive ? '#EFF6FF' : '')}
                    >
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                          <Text strong ellipsis style={{ fontSize: 13, color: isActive ? '#1D4ED8' : '#1E293B', flex: 1, minWidth: 0 }}>
                            {e.eventName}
                          </Text>
                          <Tag style={{ fontSize: 10, lineHeight: '18px', padding: '0 6px', borderRadius: 4, border: 'none', background: cat.color + '18', color: cat.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {cat.label}
                          </Tag>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <Text type="secondary" ellipsis style={{ fontSize: 11, fontFamily: 'SF Mono, Fira Code, monospace', flex: 1, minWidth: 0 }}>
                            {e.eventKey}
                          </Text>
                          <Space size={8}>
                            {e.references?.length > 0 && (
                              <Tooltip title="引用数">
                                <span style={{ fontSize: 11, color: TOKENS.accent }}>
                                  <LinkOutlined style={{ marginRight: 2 }} />{e.references.length}
                                </span>
                              </Tooltip>
                            )}
                            {e.properties?.length > 0 && (
                              <Tooltip title="属性数">
                                <span style={{ fontSize: 11, color: TOKENS.success }}>
                                  <NodeIndexOutlined style={{ marginRight: 2 }} />{e.properties.length}
                                </span>
                              </Tooltip>
                            )}
                          </Space>
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>

        {/* Right: Detail Panels */}
        <Col span={17}>
          {!currentLineage ? (
            <Card
              style={{ borderRadius: 8, border: `1px solid ${TOKENS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'center', padding: '80px 0' }}
            >
              <NodeIndexOutlined style={{ fontSize: 48, color: '#CBD5E1', marginBottom: 16 }} />
              <Paragraph type="secondary" style={{ fontSize: 15, marginBottom: 8 }}>
                选择左侧事件查看血缘关系
              </Paragraph>
              <Text type="secondary" style={{ fontSize: 12 }}>
                血缘追踪展示事件在下游看板、漏斗、留存等分析资源中的引用链路
              </Text>
            </Card>
          ) : loading ? (
            <Card style={{ borderRadius: 8, border: `1px solid ${TOKENS.border}` }}>
              <Skeleton active paragraph={{ rows: 3 }} />
              <Divider />
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          ) : (
            <>
              {/* Reference Card */}
              <Card
                size="small"
                title={
                  <Space>
                    <LinkOutlined style={{ color: TOKENS.accent }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{currentLineage.eventName}</span>
                    <Tag style={{ fontSize: 11, borderRadius: 4 }}>{CATEGORY_META[currentLineage.category || '']?.label || currentLineage.category}</Tag>
                  </Space>
                }
                style={{ marginBottom: 12, borderRadius: 8, border: `1px solid ${TOKENS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                {currentLineage.references.length === 0 && currentLineage.properties.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <Text type="secondary">该事件未被任何下游资源引用，也无关联属性</Text>
                    <br />
                    <Tag color="success" style={{ marginTop: 8 }}>可安全删除</Tag>
                  </div>
                ) : (
                  <>
                    {currentLineage.references.length > 0 && (
                      <div style={{ marginBottom: currentLineage.properties.length > 0 ? 12 : 0 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>下游引用 ({currentLineage.references.length})</Text>
                        <Space wrap size={[4, 4]}>
                          {currentLineage.references.map((ref: LineageRef, i: number) => (
                            <Tag key={i} color="orange" style={{ cursor: 'pointer', padding: '1px 8px', borderRadius: 4 }}
                              onClick={() => {
                                if (ref.refType === 'dashboard') navigate(`/tracker/engineering/plans/${ref.refId}`);
                              }}>
                              {REF_TYPE_LABELS[ref.refType]?.icon}
                              <span style={{ marginLeft: 4 }}>{ref.refName}</span>
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                    {currentLineage.properties.length > 0 && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>关联属性 ({currentLineage.properties.length})</Text>
                        <Space wrap size={[4, 4]}>
                          {currentLineage.properties.map((p) => (
                            <Tag key={p.propKey} color="green" style={{ borderRadius: 4 }}>
                              {p.propName}
                              <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>{p.dataType}</Text>
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                  </>
                )}
              </Card>

              {/* Graph Card */}
              <Card
                size="small"
                title={
                  <Space>
                    <NodeIndexOutlined style={{ color: TOKENS.primary }} />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>血缘关系图</span>
                    {currentGraph && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {currentGraph.nodes.length} 节点 · {currentGraph.edges.length} 边
                      </Text>
                    )}
                  </Space>
                }
                extra={
                  <Space size={4}>
                    {Object.entries(NODE_LABELS).map(([type, label]) => {
                      const active = visibleTypes.has(type);
                      const c = NODE_COLORS[type]?.fill || '#999';
                      return (
                        <Tag key={type}
                          style={{
                            cursor: 'pointer', borderRadius: 4, padding: '0 8px',
                            background: active ? c + '18' : '#F1F5F9',
                            color: active ? c : '#94A3B8',
                            border: active ? `1px solid ${c}40` : '1px solid #E2E8F0',
                            opacity: active ? 1 : 0.6,
                          }}
                          onClick={() => toggleType(type)}
                        >
                          {active ? <EyeOutlined style={{ marginRight: 4 }} /> : <EyeInvisibleOutlined style={{ marginRight: 4 }} />}
                          {label}
                        </Tag>
                      );
                    })}
                  </Space>
                }
                style={{ borderRadius: 8, border: `1px solid ${TOKENS.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    {graphOption ? (
                      <ReactECharts option={graphOption} style={{ height: 420 }} notMerge
                        onEvents={{ click: onGraphClick }} />
                    ) : (
                      <Empty description="暂无图谱数据" style={{ padding: 60 }} />
                    )}
                  </div>
                  {/* Quick navigation */}
                  {currentLineage && (
                    <div style={{ width: 160, borderLeft: `1px solid ${TOKENS.border}`, paddingLeft: 12 }}>
                      <Text strong style={{ fontSize: 11, color: TOKENS.muted, display: 'block', marginBottom: 8 }}>快捷导航</Text>
                      <Space direction="vertical" size={8}>
                        {currentLineage.references.map((ref, i) => (
                          <Button key={i} type="text" size="small" block
                            style={{ textAlign: 'left', fontSize: 12, color: TOKENS.accent }}
                            onClick={() => navigate(`/tracker/engineering/plans/${ref.refId}`)}>
                            <span style={{ fontSize: 10, marginRight: 4 }}>📋</span>{ref.refName}
                          </Button>
                        ))}
                        {currentLineage.references.length === 0 && (
                          <Text type="secondary" style={{ fontSize: 11 }}>无下游资源</Text>
                        )}
                      </Space>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </Col>
      </Row>
    </div>
  );
}
