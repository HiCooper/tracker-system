import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Form, Input, Typography, message, theme } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';

const { Title, Text } = Typography;

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token: themeToken } = theme.useToken();
  const isAuth = useAuthStore((s) => !!s.token);

  // Already logged in — redirect
  if (isAuth) {
    const redirect = searchParams.get('redirect') || '/tracker/setup';
    navigate(redirect, { replace: true });
    return null;
  }

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const { login } = useAuthStore.getState();
      await login(values.username, values.password);
      message.success('登录成功');
      const redirect = searchParams.get('redirect') || '/tracker/setup';
      navigate(redirect, { replace: true });
    } catch (err) {
      message.error(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(135deg, ${themeToken.colorPrimary}15 0%, ${themeToken.colorPrimaryBg} 100%)`,
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ marginBottom: 4 }}>GateFlow Tracker</Title>
          <Text type="secondary">埋点管理系统</Text>
        </div>
        <Form name="login" onFinish={handleSubmit} size="large" autoComplete="off">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
