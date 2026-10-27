import { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { api } from '../services/api';

export default function ChangePasswordModal({ open, onCancel }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await api.changePassword(values.currentPassword, values.newPassword);
      message.success('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới.');
      form.resetFields();
      onCancel();
    } catch (error) {
      if (error?.errorFields) return; // Validation error
      message.error(error.message || 'Không thể đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Đổi mật khẩu tài khoản"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      confirmLoading={loading}
      okText="Xác nhận đổi"
      cancelText="Hủy"
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="Mật khẩu hiện tại"
          name="currentPassword"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu đang dùng" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu mới (tối thiểu 6 ký tự)"
          name="newPassword"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 6, message: 'Mật khẩu phải từ 6 ký tự trở lên' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới" />
        </Form.Item>

        <Form.Item
          label="Xác nhận mật khẩu mới"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
