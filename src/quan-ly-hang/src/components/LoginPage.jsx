import React from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';

const { Title, Text } = Typography;

const defaultUsers = {
  admin: { username: 'admin', password: 'admin123', role: 'admin', name: 'Quản trị viên' },
  staff: { username: 'staff', password: 'staff123', role: 'staff', name: 'Nhân viên kho' },
};

const LoginPage = ({ onLogin }) => {
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const result = await response.json();
        onLogin(result.user, result.token);
        return;
      }

      const fallbackUser = defaultUsers[values.username];
      if (fallbackUser && fallbackUser.password === values.password) {
        onLogin({ username: fallbackUser.username, role: fallbackUser.role, name: fallbackUser.name }, 'demo-token');
        return;
      }

      const error = await response.json().catch(() => ({ message: 'Sai tài khoản hoặc mật khẩu.' }));
      message.error(error.message || 'Đăng nhập thất bại.');
    } catch {
      const fallbackUser = defaultUsers[values.username];
      if (fallbackUser && fallbackUser.password === values.password) {
        onLogin({ username: fallbackUser.username, role: fallbackUser.role, name: fallbackUser.name }, 'demo-token');
        return;
      }
      message.error('Không thể kết nối máy chủ. Sử dụng tài khoản demo: admin/admin123 hoặc staff/staff123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fb', padding: 20 }}>
      <Card style={{ width: 420, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Title level={3} style={{ marginBottom: 8 }}>Đăng nhập</Title>
          <Text type="secondary">Hệ thống quản lý kho hàng</Text>
        </div>

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập.' }]}
          >
            <Input placeholder="admin hoặc staff" />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }}>
            Đăng nhập
          </Button>
        </Form>

        <div style={{ marginTop: 20, fontSize: 12, color: '#667085' }}>
          Tài khoản demo: admin / admin123 hoặc staff / staff123
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
