import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  AimOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  NumberOutlined,
  LineChartOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  {
    key: 'tracking',
    label: '埋点管理',
    icon: <AimOutlined />,
    children: [
      { key: '/tracker/events', label: '事件管理', icon: <AppstoreOutlined /> },
      { key: '/tracker/properties', label: '属性管理', icon: <NodeIndexOutlined /> },
      { key: '/tracker/spm', label: 'SPM管理', icon: <NumberOutlined /> },
    ],
  },
  {
    key: 'analytics',
    label: '流量分析',
    icon: <BarChartOutlined />,
    children: [
      { key: '/tracker/event-analysis', label: '事件分析', icon: <LineChartOutlined /> },
      { key: '/tracker/dashboards', label: '可视化看板', icon: <DashboardOutlined /> },
      { key: '/tracker/session-analysis', label: 'Session分析', icon: <ClockCircleOutlined /> },
    ],
  },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  const selectedKey = location.pathname;
  const openKeys = menuItems
    .filter((item) => 'children' in item!)
    .filter((item) =>
      (item as { children: { key: string }[] }).children.some((child) =>
        selectedKey.startsWith(child.key),
      ),
    )
    .map((item) => item!.key as string);

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        style={{
          background: themeToken.colorBgContainer,
          borderRight: `1px solid ${themeToken.colorBorderSecondary}`,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
          }}
        >
          <span
            style={{
              fontSize: collapsed ? 16 : 18,
              fontWeight: 700,
              color: themeToken.colorPrimary,
              whiteSpace: 'nowrap',
            }}
          >
            {collapsed ? 'GT' : 'GateFlow Tracker'}
          </span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={onMenuClick}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: themeToken.colorBgContainer,
            borderBottom: `1px solid ${themeToken.colorBorderSecondary}`,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 18, cursor: 'pointer' }}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </span>
        </Header>
        <Content
          style={{
            margin: 24,
            padding: 24,
            background: themeToken.colorBgContainer,
            borderRadius: themeToken.borderRadiusLG,
            minHeight: 280,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
