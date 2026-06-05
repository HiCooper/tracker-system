import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  AimOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  { key: '/tracker/setup', label: '埋点管理', icon: <AimOutlined /> },
  { key: '/tracker/analysis', label: '流量分析', icon: <BarChartOutlined /> },
];

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: themeToken } = theme.useToken();

  const selectedKey = location.pathname.startsWith('/tracker/analysis')
    ? '/tracker/analysis'
    : '/tracker/setup';

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
          items={menuItems}
          onClick={({ key }) => navigate(key)}
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
