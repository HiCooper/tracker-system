export type LineageRefType = 'dashboard' | 'funnel' | 'retention' | 'path' | 'segment';

export interface LineageRef {
  refType: LineageRefType;
  refId: number;
  refName: string;
}

export interface EventLineage {
  eventKey: string;
  eventName: string;
  category: string;
  references: LineageRef[];
  properties: { propKey: string; propName: string; dataType: string }[];
}

export interface LineageGraphNode {
  id: string;
  name: string;
  type: 'event' | 'property' | 'dashboard' | 'funnel' | 'retention' | 'path';
  symbolSize?: number;
}

export interface LineageGraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface LineageGraph {
  nodes: LineageGraphNode[];
  edges: LineageGraphEdge[];
}
