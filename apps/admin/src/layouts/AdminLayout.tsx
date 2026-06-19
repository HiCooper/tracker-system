import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  AimOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  NodeIndexOutlined,
  ProjectOutlined,
  ApartmentOutlined,
  BugOutlined,
  LogoutOutlined,
  MonitorOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  FireOutlined,
  FunnelPlotOutlined,
  HeatMapOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '../stores/authStore';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  {
    key: 'engineering',
    label: '埋点工程',
    icon: <ProjectOutlined />,
    children: [
      { key: '/tracker/setup', label: '埋点管理', icon: <AimOutlined /> },
      { key: '/tracker/engineering/plans', label: '需求管理', icon: <ApartmentOutlined /> },
      { key: '/tracker/engineering/lineage', label: '血缘追踪', icon: <NodeIndexOutlined /> },
      { key: '/tracker/engineering/debug', label: 'Debug 验证', icon: <BugOutlined /> },
      { key: '/tracker/engineering/autotrack', label: '全埋点管理', icon: <ThunderboltOutlined /> },
      { key: '/tracker/engineering/verify', label: '埋点验证', icon: <SafetyCertificateOutlined /> },
    ],
  },
  {
    key: 'analytics',
    label: '数据分析',
    icon: <BarChartOutlined />,
    children: [
      { key: '/tracker/data-platform', label: '平台数据', icon: <BarChartOutlined /> },
      { key: '/tracker/analysis', label: '流量分析', icon: <FireOutlined /> },
      { key: '/tracker/advanced', label: '高级分析', icon: <FunnelPlotOutlined /> },
      { key: '/tracker/behavior', label: '行为分析', icon: <NodeIndexOutlined /> },
      { key: '/tracker/experience', label: '体验分析', icon: <HeatMapOutlined /> },
      { key: '/tracker/bi', label: '看板搭建', icon: <DashboardOutlined /> },
      // NOTE: 画像洞察(portrait)/标签人群(cdp) 需先建标签/人群引擎,后端未实现,暂隐藏入口避免 404。
    ],
  },
  { key: '/tracker/monitor', label: '系统监控', icon: <MonitorOutlined /> },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();
  const username = useAuthStore((s) => s.username);

  const handleLogout = () => {
    useAuthStore.getState().logout();
    navigate('/login', { replace: true });
  };

  const selectedKey = (() => {
    if (location.pathname.startsWith('/tracker/engineering/lineage')) return '/tracker/engineering/lineage';
    if (location.pathname.startsWith('/tracker/engineering/debug')) return '/tracker/engineering/debug';
    if (location.pathname.startsWith('/tracker/engineering/autotrack')) return '/tracker/engineering/autotrack';
    if (location.pathname.startsWith('/tracker/engineering/verify')) return '/tracker/engineering/verify';
    if (location.pathname.startsWith('/tracker/engineering/plans')) return '/tracker/engineering/plans';
    if (location.pathname.startsWith('/tracker/setup')) return '/tracker/setup';
    if (location.pathname.startsWith('/tracker/monitor')) return '/tracker/monitor';
    if (location.pathname.startsWith('/tracker/advanced')) return '/tracker/advanced';
    if (location.pathname.startsWith('/tracker/data-platform')) return '/tracker/data-platform';
    if (location.pathname.startsWith('/tracker/experience')) return '/tracker/experience';
    if (location.pathname.startsWith('/tracker/behavior')) return '/tracker/behavior';
    if (location.pathname.startsWith('/tracker/bi')) return '/tracker/bi';
    if (location.pathname.startsWith('/tracker/analysis')) return '/tracker/analysis';
    return '/tracker/setup';
  })();

  useEffect(() => {
    if (location.pathname.startsWith('/tracker/engineering') ||
        location.pathname.startsWith('/tracker/setup')) {
      setOpenKeys((prev) => prev.includes('engineering') ? prev : [...prev, 'engineering']);
    }
    if (location.pathname.startsWith('/tracker/analysis') ||
        location.pathname.startsWith('/tracker/advanced') ||
        location.pathname.startsWith('/tracker/data-platform') ||
        location.pathname.startsWith('/tracker/experience') ||
        location.pathname.startsWith('/tracker/behavior') ||
        location.pathname.startsWith('/tracker/bi')) {
      setOpenKeys((prev) => prev.includes('analytics') ? prev : [...prev, 'analytics']);
    }
  }, [location.pathname]);

  // Listen for auth-expired events from API interceptor
  useEffect(() => {
    const handler = () => {
      useAuthStore.getState().logout();
      navigate('/login', { replace: true });
    };
    window.addEventListener('gateflow:auth-expired', handler);
    return () => window.removeEventListener('gateflow:auth-expired', handler);
  }, [navigate]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={200}
        style={{
          background: themeToken.colorBgContainer,
          borderRight: `1px solid ${themeToken.colorBorderSecondary}`,
        }}
      >
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
        }}>
          <span style={{ fontSize: collapsed ? 14 : 17, fontWeight: 700, color: themeToken.colorPrimary, whiteSpace: 'nowrap' }}>
            {collapsed ? 'GT' : 'GateFlow Tracker'}
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={setOpenKeys}
          items={menuItems}
          onClick={({ key }) => { if (key.startsWith('/tracker/')) navigate(key); }}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px', background: themeToken.colorBgContainer,
          borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
            style={{ fontSize: 18, cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: 'inherit' }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {username && (
              <span style={{ color: themeToken.colorTextSecondary, fontSize: 14 }}>
                {username}
              </span>
            )}
            <button onClick={handleLogout}
              aria-label="退出登录"
              style={{ cursor: 'pointer', fontSize: 16, color: themeToken.colorTextSecondary, background: 'none', border: 'none', padding: 0 }}>
              <LogoutOutlined />
            </button>
          </div>
        </Header>
        <Content style={{
          margin: 24, padding: 24, background: themeToken.colorBgContainer,
          borderRadius: themeToken.borderRadiusLG, minHeight: 280, overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
