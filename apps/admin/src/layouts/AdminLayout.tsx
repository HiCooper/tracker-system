import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Breadcrumb, theme } from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, LogoutOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore } from '../stores/authStore';
import { navConfig, isGroup, selectedKeyFor, openKeyFor, breadcrumbFor } from '../config/nav';

const { Header, Sider, Content } = Layout;

// 菜单项由 navConfig 单一事实源派生(不再手写)
const menuItems: MenuProps['items'] = navConfig.map((n) =>
  isGroup(n)
    ? { key: n.key, label: n.label, icon: n.icon, children: n.children.map((c) => ({ key: c.path, label: c.label, icon: c.icon })) }
    : { key: n.path, label: n.label, icon: n.icon },
);

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

  const selectedKey = selectedKeyFor(location.pathname);
  const crumbs = breadcrumbFor(location.pathname);
  // 仅在顶层栏目页展示全局面包屑;下钻页(路径长于叶子)由页面自带面包屑负责,避免双面包屑
  const showCrumb = location.pathname === selectedKey && crumbs.length > 0;

  // 自动展开当前页所属分组(用户仍可手动开合)
  useEffect(() => {
    const group = openKeyFor(location.pathname);
    if (group) setOpenKeys((prev) => (prev.includes(group) ? prev : [...prev, group]));
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
          {showCrumb && (
            <Breadcrumb style={{ marginBottom: 16 }} items={crumbs.map((c) => ({ title: c }))} />
          )}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
