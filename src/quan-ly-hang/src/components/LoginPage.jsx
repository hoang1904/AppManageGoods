import React from 'react';
import { Button, Card, Form, Input, Typography, Alert } from 'antd';
import { api } from '../services/api';

const { Title, Text } = Typography;

const LoginPage = ({ onLogin }) => {
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const handleSubmit = async (values) => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Gọi API đăng nhập — server kiểm tra mật khẩu bằng bcrypt
      const result = await api.login(values.username, values.password);
      onLogin(result.user, result.token);
    } catch (error) {
      setErrorMsg(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fb', padding: 20 }}>
      <Card style={{ width: 420, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>Đăng nhập</Title>
          <Text type="secondary">Hệ thống quản lý kho hàng</Text>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setErrorMsg('')}
          />
        )}

        <Form layout="vertical" onFinish={handleSubmit} autoComplete="on">
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập.' }]}
          >
            <Input placeholder="admin hoặc staff" autoFocus />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading} style={{ width: '100%' }} size="large">
            Đăng nhập
          </Button>
        </Form>

        <div style={{ marginTop: 20, fontSize: 12, color: '#667085', textAlign: 'center' }}>
          Tài khoản demo: <strong>admin</strong> / admin123 &nbsp;·&nbsp; <strong>staff</strong> / staff123
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
