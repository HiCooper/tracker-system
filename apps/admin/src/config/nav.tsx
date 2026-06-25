import type { ReactNode } from 'react';
import {
  AimOutlined, BarChartOutlined, NodeIndexOutlined, ProjectOutlined,
  ApartmentOutlined, BugOutlined, MonitorOutlined, ThunderboltOutlined,
  SafetyCertificateOutlined, FireOutlined, FunnelPlotOutlined, HeatMapOutlined,
  DashboardOutlined,
} from '@ant-design/icons';

/**
 * 导航单一事实源:菜单渲染、选中态(selectedKey)、展开态(openKeys)、面包屑全部由此派生,
 * 取代 AdminLayout 里手维护的多分支 if 链(新增路由只需在此登记一处)。
 */
export interface NavLeaf {
  /** 路由 path,同时作为菜单 key */
  path: string;
  label: string;
  icon?: ReactNode;
}

export interface NavGroup {
  key: string;
  label: string;
  icon?: ReactNode;
  children: NavLeaf[];
}

export type NavNode = NavGroup | NavLeaf;

export function isGroup(n: NavNode): n is NavGroup {
  return (n as NavGroup).children !== undefined;
}

export const navConfig: NavNode[] = [
  {
    key: 'engineering',
    label: '埋点工程',
    icon: <ProjectOutlined />,
    children: [
      { path: '/tracker/setup', label: '埋点管理', icon: <AimOutlined /> },
      { path: '/tracker/engineering/plans', label: '需求管理', icon: <ApartmentOutlined /> },
      { path: '/tracker/engineering/lineage', label: '血缘追踪', icon: <NodeIndexOutlined /> },
      { path: '/tracker/engineering/debug', label: 'Debug 验证', icon: <BugOutlined /> },
      { path: '/tracker/engineering/autotrack', label: '全埋点管理', icon: <ThunderboltOutlined /> },
      { path: '/tracker/engineering/verify', label: '埋点验证', icon: <SafetyCertificateOutlined /> },
    ],
  },
  {
    key: 'analytics',
    label: '数据分析',
    icon: <BarChartOutlined />,
    children: [
      { path: '/tracker/data-platform', label: '平台数据', icon: <BarChartOutlined /> },
      { path: '/tracker/analysis', label: '流量分析', icon: <FireOutlined /> },
      { path: '/tracker/advanced', label: '高级分析', icon: <FunnelPlotOutlined /> },
      { path: '/tracker/behavior', label: '行为分析', icon: <NodeIndexOutlined /> },
      { path: '/tracker/experience', label: '体验分析', icon: <HeatMapOutlined /> },
      { path: '/tracker/bi', label: '看板搭建', icon: <DashboardOutlined /> },
    ],
  },
  { path: '/tracker/monitor', label: '系统监控', icon: <MonitorOutlined /> },
];

/** 所有叶子(扁平),用于最长前缀匹配。 */
export const navLeaves: { leaf: NavLeaf; groupKey?: string }[] = navConfig.flatMap((n) =>
  isGroup(n) ? n.children.map((leaf) => ({ leaf, groupKey: n.key })) : [{ leaf: n }],
);

/** 由当前路径派生选中的菜单 key:取「path 等于或为前缀」的最长叶子 path。 */
export function selectedKeyFor(pathname: string): string {
  let best = '';
  for (const { leaf } of navLeaves) {
    if ((pathname === leaf.path || pathname.startsWith(leaf.path + '/')) && leaf.path.length > best.length) {
      best = leaf.path;
    }
  }
  return best;
}

/** 由当前路径派生应展开的分组 key(无则空)。 */
export function openKeyFor(pathname: string): string | undefined {
  const key = selectedKeyFor(pathname);
  return navLeaves.find((l) => l.leaf.path === key)?.groupKey;
}

/** 面包屑:返回 [分组label?, 叶子label]。无匹配返回空数组。 */
export function breadcrumbFor(pathname: string): string[] {
  const key = selectedKeyFor(pathname);
  const hit = navLeaves.find((l) => l.leaf.path === key);
  if (!hit) return [];
  const group = navConfig.find((n) => isGroup(n) && n.key === hit.groupKey) as NavGroup | undefined;
  return group ? [group.label, hit.leaf.label] : [hit.leaf.label];
}
