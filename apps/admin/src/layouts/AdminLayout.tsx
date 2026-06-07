import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  AimOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  FunnelPlotOutlined,
  UserSwitchOutlined,
  NodeIndexOutlined,
  ProjectOutlined,
  ApartmentOutlined,
  BugOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  { key: '/tracker/setup', label: '埋点管理', icon: <AimOutlined /> },
  { key: '/tracker/analysis', label: '流量分析', icon: <BarChartOutlined /> },
  {
    key: 'advanced',
    label: '高级分析',
    icon: <NodeIndexOutlined />,
    children: [
      { key: '/tracker/advanced/funnel', label: '漏斗分析', icon: <FunnelPlotOutlined /> },
      { key: '/tracker/advanced/retention', label: '留存分析', icon: <UserSwitchOutlined /> },
      { key: '/tracker/advanced/path', label: '路径分析', icon: <NodeIndexOutlined /> },
    ],
  },
  {
    key: 'engineering',
    label: '埋点工程',
    icon: <ProjectOutlined />,
    children: [
      { key: '/tracker/engineering/plans', label: '需求管理', icon: <ApartmentOutlined /> },
      { key: '/tracker/engineering/lineage', label: '血缘追踪', icon: <NodeIndexOutlined /> },
      { key: '/tracker/engineering/debug', label: 'Debug 验证', icon: <BugOutlined /> },
    ],
  },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(['advanced']);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  const selectedKey = (() => {
    if (location.pathname.startsWith('/tracker/engineering/lineage')) return '/tracker/engineering/lineage';
    if (location.pathname.startsWith('/tracker/engineering/debug')) return '/tracker/engineering/debug';
    if (location.pathname.startsWith('/tracker/engineering/plans')) return '/tracker/engineering/plans';
    if (location.pathname.startsWith('/tracker/advanced')) return location.pathname;
    if (location.pathname.startsWith('/tracker/analysis')) return '/tracker/analysis';
    return '/tracker/setup';
  })();

  useEffect(() => {
    if (location.pathname.startsWith('/tracker/engineering')) {
      setOpenKeys((prev) => prev.includes('engineering') ? prev : [...prev, 'engineering']);
    }
  }, [location.pathname]);

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
          display: 'flex', alignItems: 'center',
        }}>
          <span onClick={() => setCollapsed(!collapsed)} style={{ fontSize: 18, cursor: 'pointer' }}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>
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
