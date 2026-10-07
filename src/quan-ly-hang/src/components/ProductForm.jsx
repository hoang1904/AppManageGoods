import React from 'react';
import { Modal, Form, Input, InputNumber, Select } from 'antd';

const ProductForm = ({ visible, onCancel, onSubmit, product, loading, categories }) => {
  const [form] = Form.useForm();

  // Reset form khi modal đóng
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  // Khi mở modal, set dữ liệu sản phẩm nếu đang sửa
  const handleSubmit = (values) => {
    onSubmit({
      ...product,
      ...values,
    });
    form.resetFields();
  };

  // Điền dữ liệu vào form khi modal mở và có product
  React.useEffect(() => {
    if (product && visible) {
      form.setFieldsValue(product);
    } else if (!product && visible) {
      form.resetFields();
    }
  }, [product, visible, form]);

  return (
    <Modal
      title={product?.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
      open={visible}
      onCancel={handleCancel}
      onOk={form.submit}
      confirmLoading={loading}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Mã sản phẩm"
          name="code"
          rules={[{ required: true, message: 'Vui lòng nhập mã sản phẩm' }]}
        >
          <Input placeholder="VD: SP001" />
        </Form.Item>

        <Form.Item
          label="Tên sản phẩm"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
        >
          <Input placeholder="Tên sản phẩm" />
        </Form.Item>

        <Form.Item
          label="Danh mục"
          name="category"
          rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
        >
          <Select
            placeholder="Chọn danh mục"
            options={categories.map((category) => ({ label: category, value: category }))}
          />
        </Form.Item>

        <Form.Item
          label="Số lượng"
          name="quantity"
          rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
        >
          <InputNumber min={0} placeholder="0" />
        </Form.Item>

        <Form.Item
          label="Giá mua"
          name="buyPrice"
          rules={[{ required: true, message: 'Vui lòng nhập giá mua' }]}
        >
          <InputNumber min={0} placeholder="0" />
        </Form.Item>

        <Form.Item
          label="Giá bán"
          name="sellPrice"
          rules={[{ required: true, message: 'Vui lòng nhập giá bán' }]}
        >
          <InputNumber min={0} placeholder="0" />
        </Form.Item>

        <Form.Item
          label="Đơn vị"
          name="unit"
          rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}
        >
          <Select
            placeholder="Chọn đơn vị"
            options={[
              { label: 'Cái', value: 'cái' },
              { label: 'Hộp', value: 'hộp' },
              { label: 'Túi', value: 'túi' },
              { label: 'Lon', value: 'lon' },
              { label: 'Chai', value: 'chai' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Ghi chú"
          name="notes"
        >
          <Input.TextArea placeholder="Ghi chú thêm..." rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ProductForm;
